"""
LLM against rules on the same sets (B3.3, D-30): intents, hotelier answers, the Curator and the
Explainer, on the development sets and on the hold-out sets written without looking at the
rules. Every call is metered: latency, tokens, cache hits, price.
"""

import asyncio
import statistics
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass, field
from functools import partial
from pathlib import Path
from typing import Any
from uuid import uuid4

from pydantic import BaseModel

from app.db.database import Database
from app.domain.knowledge.curation import RecipeDraft, place_terms
from app.domain.partner.rules import RulesAnswerParser
from app.domain.search.intent import Intent
from app.service.agents.curator import Curator
from app.service.agents.runtime import Tracer
from app.service.partner.llm_answers import LlmAnswerParser
from app.service.ports import (
    Budget,
    Clock,
    LanguageModel,
    LlmResult,
    LlmUnavailableError,
    RecordingEventBus,
    ToolSpec,
    Usage,
)
from app.service.quality.datasets import read_yaml
from app.service.quality.parsing import (
    EVAL_TODAY,
    answer_metrics,
    curator_metrics,
    intent_metrics,
    rules_plan,
)
from app.service.search.explain import explain
from app.service.search.intents import IntentParser
from app.service.search.search import SearchService

CONCURRENCY = 4
EXPLAIN_QUERIES = 8
EXPLAIN_EXAMPLES = 5


@dataclass
class Call:
    task: str
    latency_ms: int
    usage: Usage
    cached: bool


@dataclass
class MeteredModel:
    """`LanguageModel` that remembers every call it passes through."""

    inner: LanguageModel
    calls: list[Call] = field(default_factory=list)
    failures: dict[str, int] = field(default_factory=dict)

    @property
    def available(self) -> bool:
        return self.inner.available

    async def structured[T: BaseModel](
        self, *, task: str, system: str, prompt: str, output: type[T]
    ) -> LlmResult[T]:
        return await self._meter(
            task, self.inner.structured(task=task, system=system, prompt=prompt, output=output)
        )

    async def run_tools[T: BaseModel](
        self,
        *,
        task: str,
        system: str,
        prompt: str,
        tools: Sequence[ToolSpec],
        output: type[T],
        budget: Budget,
    ) -> LlmResult[T]:
        return await self._meter(
            task,
            self.inner.run_tools(
                task=task, system=system, prompt=prompt, tools=tools, output=output, budget=budget
            ),
        )

    async def _meter[T](self, task: str, call: Awaitable[LlmResult[T]]) -> LlmResult[T]:
        try:
            result = await call
        except LlmUnavailableError:
            self.failures[task] = self.failures.get(task, 0) + 1
            raise
        self.calls.append(Call(task, result.latency_ms, result.usage, result.cached))
        return result

    def summary(self) -> dict[str, Any]:
        tasks = sorted({c.task for c in self.calls} | set(self.failures))
        per_task = {t: _task_summary([c for c in self.calls if c.task == t]) for t in tasks}
        for task, failed in self.failures.items():
            per_task[task]["failed"] = failed
        return {
            "tasks": per_task,
            "costUsd": round(sum(c.usage.cost_usd for c in self.calls if not c.cached), 4),
        }


def _task_summary(calls: list[Call]) -> dict[str, Any]:
    """Speed and price per call from every answer, cached ones included (their first run)."""
    latencies = sorted(c.latency_ms for c in calls if c.latency_ms)
    first = sum((c.usage for c in calls), Usage())
    spent = sum((c.usage for c in calls if not c.cached), Usage())
    return {
        "calls": len(calls),
        "cached": sum(c.cached for c in calls),
        "failed": 0,
        "p50Ms": round(statistics.median(latencies)) if latencies else None,
        "p95Ms": latencies[min(len(latencies) - 1, round(0.95 * (len(latencies) - 1)))]
        if latencies
        else None,
        "inputTokens": first.input_tokens,
        "cachedTokens": first.cached_tokens,
        "outputTokens": first.output_tokens,
        "costUsd": round(spent.cost_usd, 4),
        "costPerCallUsd": round(first.cost_usd / len(calls), 6) if calls else None,
    }


class SilentTracer(Tracer):
    """A tracer that keeps nothing: the evaluation must not fill the console with runs."""

    def __init__(self, db: Database, clock: Clock) -> None:
        super().__init__(db, RecordingEventBus(), clock, uuid4())

    async def _write(self, *_: Any, **__: Any) -> None:
        return None


async def _prefetch[T](
    inputs: Sequence[str], fn: Callable[[str], Awaitable[T]]
) -> Callable[[str], Awaitable[T]]:
    """Run `fn` over all inputs with bounded concurrency; return a lookup with the same shape."""
    gate = asyncio.Semaphore(CONCURRENCY)

    async def one(text: str) -> T:
        async with gate:
            return await fn(text)

    results = dict(zip(inputs, await asyncio.gather(*(one(t) for t in inputs)), strict=True))

    async def lookup(text: str) -> T:
        return results[text]

    return lookup


async def evaluate_llm(
    db: Database,
    data_dir: Path,
    clock: Clock,
    llm: LanguageModel,
    strong: LanguageModel,
    *,
    make_curator: Callable[[LanguageModel], Curator],
) -> dict[str, Any]:
    fast, smart = MeteredModel(llm), MeteredModel(strong)
    places = place_terms(await read_yaml(data_dir / "registry/osm_vocabulary.yaml"))
    curator = make_curator(smart)

    async def intent(model: LanguageModel | None, text: str) -> Intent:
        async with db.unit_of_work() as uow:
            return await IntentParser(uow, data_dir, model).parse(text, today=EVAL_TODAY)

    async def llm_plan(description: str) -> RecipeDraft:
        return await curator.plan(description, SilentTracer(db, clock))

    sets: dict[str, Any] = {}
    for name, folder in (("main", data_dir / "eval"), ("holdout", data_dir / "eval/holdout")):
        if not (folder / "intents.yaml").exists():
            continue
        cases = await read_yaml(folder / "intents.yaml")
        queries = [c["query"] for c in cases]
        by_llm = await _prefetch(queries, partial(intent, fast))
        by_rules = await _prefetch(queries, partial(intent, None))
        descriptions = [c["description"] for c in await read_yaml(folder / "curator.yaml")]
        sets[name] = {
            "intents": {
                "rules": await intent_metrics(by_rules, cases),
                "llm": await intent_metrics(by_llm, cases, require_llm=True),
            },
            "answers": {
                "rules": await answer_metrics(
                    RulesAnswerParser(), folder / "hotelier_answers.yaml"
                ),
                "llm": await answer_metrics(
                    LlmAnswerParser(fast), folder / "hotelier_answers.yaml"
                ),
            },
            "curator": {
                "rules": await curator_metrics(folder / "curator.yaml", rules_plan(places)),
                "llm": await curator_metrics(
                    folder / "curator.yaml", await _prefetch(descriptions, llm_plan)
                ),
            },
        }
    return {
        "sets": sets,
        "explain": await _explain(db, clock, data_dir, fast),
        "usage": {"fast": fast.summary(), "strong": smart.summary()},
        "costUsd": round(fast.summary()["costUsd"] + smart.summary()["costUsd"], 4),
    }


async def _explain(
    db: Database, clock: Clock, data_dir: Path, llm: LanguageModel
) -> dict[str, Any]:
    """How often the LLM's wording of a trade-off passes the code's faithfulness check."""
    cases = (await read_yaml(data_dir / "eval/intents.yaml"))[:EXPLAIN_QUERIES]
    attempted = accepted = 0
    examples: list[dict[str, str | None]] = []
    for case in cases:
        async with db.unit_of_work() as uow:
            intent = await IntentParser(uow, data_dir).parse(case["query"], today=EVAL_TODAY)
            ranking = await SearchService(uow, clock).rank(intent)
        rephrased = await explain(ranking, llm)
        for before, after in zip(ranking.matches[:3], rephrased.matches[:3], strict=True):
            if before.tradeoff is None:
                continue
            attempted += 1
            if after.tradeoff != before.tradeoff:
                accepted += 1
                if len(examples) < EXPLAIN_EXAMPLES:
                    examples.append({"rules": before.tradeoff, "llm": after.tradeoff})
    return {
        "attempted": attempted,
        "accepted": accepted,
        "acceptedShare": round(accepted / attempted, 4) if attempted else None,
        "examples": examples,
    }
