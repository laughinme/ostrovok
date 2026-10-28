"""
`LanguageModel` on PydanticAI (D-10): any OpenAI-compatible endpoint behind our port. Every
failure — no key, provider error, timeout, schema mismatch, daily limit — becomes
`LlmUnavailableError`, and the caller falls back to its rule-based twin.
"""

import asyncio
import logging
from collections.abc import Sequence
from typing import Any

from pydantic import BaseModel
from pydantic_ai import Agent, Tool, UsageLimits
from pydantic_ai.models import Model
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

from app.infra.llm.cache import LlmCache, cache_key, schema_fingerprint
from app.infra.llm.guards import CircuitBreaker, DailyLimit
from app.service.ports import Budget, LlmResult, LlmUnavailableError, ToolSpec, Usage

logger = logging.getLogger(__name__)


def openai_compatible(base_url: str, api_key: str, model: str) -> Model:
    return OpenAIChatModel(
        model, provider=OpenAIProvider(base_url=base_url or None, api_key=api_key)
    )


class PydanticAiLanguageModel:
    def __init__(
        self,
        model: Model | None,
        *,
        model_name: str,
        timeout_sec: float,
        limit: DailyLimit,
        cache: LlmCache | None = None,
        breaker: CircuitBreaker | None = None,
    ) -> None:
        self._model = model
        self._name = model_name
        self._timeout = timeout_sec
        self._limit = limit
        self._cache = cache
        self._breaker = breaker or CircuitBreaker()

    @property
    def available(self) -> bool:
        return self._model is not None and not self._breaker.open

    async def structured[T: BaseModel](
        self, *, task: str, system: str, prompt: str, output: type[T]
    ) -> LlmResult[T]:
        return await self._run(
            task, system, prompt, output, tools=(), budget=Budget(max_requests=2)
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
        return await self._run(task, system, prompt, output, tools=tools, budget=budget)

    async def _run[T: BaseModel](
        self,
        task: str,
        system: str,
        prompt: str,
        output: type[T],
        *,
        tools: Sequence[ToolSpec],
        budget: Budget,
    ) -> LlmResult[T]:
        if self._model is None:
            raise LlmUnavailableError("no LLM key configured")
        if self._breaker.open:
            raise LlmUnavailableError("LLM provider failed recently")
        key = cache_key(
            self._name,
            task,
            system,
            prompt,
            schema_fingerprint(output),
            ",".join(t.name for t in tools),
        )
        if self._cache is not None and (hit := await self._cache.get(key)):
            return LlmResult(output.model_validate(hit["output"]), Usage(), self._name, cached=True)
        if not await self._limit.take():
            raise LlmUnavailableError("daily LLM call limit reached")
        agent = Agent(
            self._model,
            output_type=output,
            instructions=system,
            tools=[_tool(t) for t in tools],
        )
        limits = UsageLimits(
            request_limit=budget.max_requests,
            tool_calls_limit=budget.max_tool_calls,
            output_tokens_limit=budget.max_output_tokens,
        )
        try:
            result = await asyncio.wait_for(
                agent.run(prompt, usage_limits=limits),
                timeout=min(self._timeout, budget.max_seconds),
            )
        except Exception as exc:  # any provider, schema or limit failure means "use the rules"
            logger.warning("LLM task %s failed: %r", task, exc)
            if not isinstance(exc, TimeoutError | ValueError):
                self._breaker.trip()
            raise LlmUnavailableError(f"{type(exc).__name__}: {exc}") from exc
        self._breaker.reset()
        run_usage = result.usage
        usage = Usage(
            requests=run_usage.requests,
            input_tokens=run_usage.input_tokens,
            output_tokens=run_usage.output_tokens,
        )
        if self._cache is not None:
            await self._cache.put(
                key,
                model=self._name,
                task=task,
                output=result.output.model_dump(mode="json"),
                usage={
                    "requests": usage.requests,
                    "inputTokens": usage.input_tokens,
                    "outputTokens": usage.output_tokens,
                },
            )
        return LlmResult(result.output, usage, self._name)


def _tool(spec: ToolSpec) -> Tool[Any]:
    async def call(**kwargs: Any) -> Any:
        result = await spec.call(spec.args.model_validate(kwargs))
        return result.model_dump(mode="json") if isinstance(result, BaseModel) else result

    return Tool.from_schema(
        function=call,
        name=spec.name,
        description=spec.description,
        json_schema=spec.args.model_json_schema(),
        takes_ctx=False,
    )
