"""
`LanguageModel` on PydanticAI (D-10): any OpenAI-compatible endpoint behind our port. Every
failure — no key, provider error, timeout, schema mismatch, daily limit — becomes
`LlmUnavailableError`, and the caller falls back to its rule-based twin.
"""

import asyncio
import json
import logging
import time
from collections.abc import Sequence
from typing import Any
from urllib.parse import urlsplit

import pydantic_ai
from openai import AsyncOpenAI
from pydantic import BaseModel
from pydantic_ai import Agent, Tool, UsageLimits
from pydantic_ai.exceptions import UnexpectedModelBehavior, UsageLimitExceeded
from pydantic_ai.models import Model
from pydantic_ai.models.openai import OpenAIChatModel, OpenAIResponsesModel
from pydantic_ai.profiles.openai import openai_model_profile
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.settings import ModelSettings

from app.core.config import LlmThinking
from app.infra.llm.cache import LlmCache, cache_key, schema_fingerprint
from app.infra.llm.guards import CircuitBreaker, DailyLimit, ModeSwitch
from app.infra.llm.journal import LlmJournal, run_cost, tool_calls
from app.service.ports import Budget, LlmResult, LlmUnavailableError, ToolSpec, Usage

logger = logging.getLogger(__name__)

Thinking = LlmThinking


def model_settings(thinking: Thinking) -> ModelSettings:
    """Reasoning effort via PydanticAI's unified `thinking` setting; "default" keeps the model's."""
    if thinking == "default":
        return ModelSettings()
    return ModelSettings(thinking=False if thinking == "off" else thinking)


pydantic_ai.BANNER_ENABLED = False  # logs are ours: no first-run banner in stdout

OPENAI_API = "api.openai.com"
CACHE_VERSION = "provider-profiles-v2"


def openai_compatible(base_url: str, api_key: str, model: str) -> Model:
    """
    OpenAI itself through the Responses API: there reasoning effort and function tools work
    together (Chat Completions rejects the pair for gpt-5.4+). Every other OpenAI-compatible
    endpoint (Gemini, OpenRouter, Yandex, Ollama) through Chat Completions.
    """
    host = urlsplit(base_url).hostname if base_url else OPENAI_API
    headers: dict[str, Any] | None = (
        {"x-goog-api-key": api_key, "Authorization": ""}
        if host
        and (host == "aiplatform.googleapis.com" or host.endswith("-aiplatform.googleapis.com"))
        else None
    )
    client = AsyncOpenAI(
        base_url=base_url or "https://api.openai.com/v1",
        api_key=api_key,
        default_headers=headers,
        max_retries=0,
    )
    provider = OpenAIProvider(openai_client=client)
    if host == OPENAI_API:
        return OpenAIResponsesModel(model, provider=provider)
    # Polza keeps the vendor prefix in its API IDs. The SDK's OpenAI profile matcher
    # expects the bare name; otherwise unified `thinking` is silently ignored.
    profile = (
        openai_model_profile(model.removeprefix("openai/"))
        if host == "polza.ai" and model.startswith("openai/")
        else None
    )
    return OpenAIChatModel(model, provider=provider, profile=profile)


class PydanticAiLanguageModel:
    def __init__(
        self,
        model: Model | None,
        *,
        model_name: str,
        provider_url: str = "",
        cache_only: bool = False,
        timeout_sec: float,
        limit: DailyLimit,
        thinking: Thinking = "default",
        cache: LlmCache | None = None,
        breaker: CircuitBreaker | None = None,
        switch: ModeSwitch | None = None,
        journal: LlmJournal | None = None,
    ) -> None:
        self._cache_only = cache_only
        self._switch = switch
        self._model = model
        self._name = model_name
        self._provider_url = provider_url.rstrip("/")
        self._timeout = timeout_sec
        self._limit = limit
        self._thinking = thinking
        self._cache = cache
        self._breaker = breaker or CircuitBreaker()
        self._journal = journal

    @property
    def name(self) -> str:
        return self._name

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
        if self._switch is not None and not await self._switch.on():
            raise LlmUnavailableError("LLM выключена в консоли")
        key = cache_key(
            CACHE_VERSION,
            self._provider_url,
            self._name,
            self._thinking,
            task,
            system,
            prompt,
            schema_fingerprint(output),
            json.dumps(
                [(t.name, t.description, t.args.model_json_schema()) for t in tools], sort_keys=True
            ),
        )
        if self._cache is not None and (hit := await self._cache.get(key)):
            cached = output.model_validate(hit["output"], by_name=True)
            await self._log(task, "cached", prompt, output=hit["output"])
            # What the answer cost when it was computed: nothing is spent now (`cached`).
            first = hit["usage"]
            return LlmResult(
                cached,
                Usage(
                    first.get("requests", 0),
                    first.get("inputTokens", 0),
                    first.get("outputTokens", 0),
                    first.get("cachedTokens", 0),
                    first.get("costUsd", 0.0),
                ),
                self._name,
                cached=True,
                latency_ms=first.get("latencyMs", 0),
            )
        if self._cache_only:
            raise LlmUnavailableError("no cached answer; network disabled for this evaluation")
        if not await self._limit.take():
            await self._log(task, "limit", prompt, error="daily LLM call limit reached")
            raise LlmUnavailableError("daily LLM call limit reached")
        agent = Agent(
            self._model,
            output_type=output,
            instructions=system,
            tools=[_tool(t) for t in tools],
            model_settings=model_settings(self._thinking),
        )
        limits = UsageLimits(
            request_limit=budget.max_requests,
            tool_calls_limit=budget.max_tool_calls,
            output_tokens_limit=budget.max_output_tokens,
        )
        started = time.perf_counter()
        try:
            result = await asyncio.wait_for(
                agent.run(prompt, usage_limits=limits),
                timeout=min(self._timeout, budget.max_seconds),
            )
        except Exception as exc:  # any provider, schema or limit failure means "use the rules"
            logger.warning("LLM task %s failed: %r", task, exc)
            if not isinstance(
                exc, TimeoutError | ValueError | UnexpectedModelBehavior | UsageLimitExceeded
            ):
                self._breaker.trip()
            await self._log(
                task,
                "failed",
                prompt,
                latency_ms=_since(started),
                error=f"{type(exc).__name__}: {exc}",
            )
            raise LlmUnavailableError(f"{type(exc).__name__}: {exc}") from exc
        latency = _since(started)
        self._breaker.reset()
        run_usage = result.usage
        usage = Usage(
            requests=run_usage.requests,
            input_tokens=run_usage.input_tokens,
            output_tokens=run_usage.output_tokens,
            cached_tokens=run_usage.cache_read_tokens,
        )
        usage = Usage(
            usage.requests,
            usage.input_tokens,
            usage.output_tokens,
            usage.cached_tokens,
            run_cost(self._name, run_usage.cost, usage),
        )
        dumped = result.output.model_dump(mode="json", by_alias=True)
        if self._cache is not None:
            await self._cache.put(
                key,
                model=self._name,
                task=task,
                output=dumped,
                usage={
                    "requests": usage.requests,
                    "inputTokens": usage.input_tokens,
                    "outputTokens": usage.output_tokens,
                    "cachedTokens": usage.cached_tokens,
                    "costUsd": usage.cost_usd,
                    "latencyMs": latency,
                },
            )
        await self._log(
            task,
            "ok",
            prompt,
            output=dumped,
            calls=tool_calls(result.all_messages(), {t.name for t in tools}),
            usage=usage,
            latency_ms=latency,
        )
        return LlmResult(result.output, usage, self._name, latency_ms=latency)

    async def _log(self, task: str, status: str, prompt: str, **fields: Any) -> None:
        if self._journal is not None:
            await self._journal.write(
                task=task, model=self._name, status=status, prompt=prompt, **fields
            )


def _since(started: float) -> int:
    return round((time.perf_counter() - started) * 1000)


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
