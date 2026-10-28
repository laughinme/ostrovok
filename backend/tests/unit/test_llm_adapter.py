import asyncio
import json
from typing import Any

import httpx
import pytest
from openai import AsyncOpenAI
from pydantic import BaseModel
from pydantic_ai import ModelMessage, ModelResponse, TextPart, ToolCallPart, models
from pydantic_ai.exceptions import UnexpectedModelBehavior
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.infra.llm import pydantic_ai_model
from app.infra.llm.guards import DailyLimit
from app.infra.llm.pydantic_ai_model import PydanticAiLanguageModel, openai_compatible
from app.service.ports import Budget, LlmUnavailableError, ToolSpec

models.ALLOW_MODEL_REQUESTS = False


class Answer(BaseModel):
    value: int


class Probe(BaseModel):
    tag: str


def _llm(function: object, *, limit: int = 10, timeout_sec: float = 5) -> PydanticAiLanguageModel:
    return PydanticAiLanguageModel(
        FunctionModel(function),  # type: ignore[arg-type]
        model_name="fake",
        timeout_sec=timeout_sec,
        limit=DailyLimit(None, limit),
    )


def _final(info: AgentInfo, payload: dict[str, object]) -> ModelResponse:
    tool = info.output_tools[0].name
    return ModelResponse(parts=[ToolCallPart(tool, payload)])


async def test_structured_output_is_validated() -> None:
    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        return _final(info, {"value": 42})

    result = await _llm(model).structured(task="t", system="s", prompt="p", output=Answer)

    assert result.output.value == 42


async def test_tools_are_called_with_validated_arguments() -> None:
    seen: list[str] = []

    async def probe(args: BaseModel) -> dict[str, int]:
        assert isinstance(args, Probe)
        seen.append(args.tag)
        return {"count": 37}

    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        if len(messages) == 1:
            return ModelResponse(parts=[ToolCallPart("osm.tag_stats", {"tag": "cuisine=georgian"})])
        returned = json.loads(json.dumps(messages[-1].parts[0].content))  # type: ignore[union-attr]
        return _final(info, {"value": returned["count"]})

    spec = ToolSpec(name="osm.tag_stats", description="count tags", args=Probe, call=probe)
    result = await _llm(model).run_tools(
        task="t", system="s", prompt="p", tools=[spec], output=Answer, budget=Budget()
    )

    assert seen == ["cuisine=georgian"]
    assert result.output.value == 37


async def test_provider_failure_becomes_unavailable_and_opens_the_breaker() -> None:
    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        raise ConnectionError("provider down")

    llm = _llm(model)
    with pytest.raises(LlmUnavailableError):
        await llm.structured(task="t", system="s", prompt="p", output=Answer)

    assert not llm.available


async def test_daily_limit_stops_paid_calls() -> None:
    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        return _final(info, {"value": 1})

    llm = _llm(model, limit=1)
    await llm.structured(task="t", system="s", prompt="a", output=Answer)
    with pytest.raises(LlmUnavailableError, match="daily"):
        await llm.structured(task="t", system="s", prompt="b", output=Answer)


async def test_timeout_cancels_the_call_without_disabling_other_tasks() -> None:
    cancelled = asyncio.Event()

    async def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        try:
            await asyncio.sleep(60)
        finally:
            cancelled.set()
        return _final(info, {"value": 42})

    llm = _llm(model, timeout_sec=0.5)
    with pytest.raises(LlmUnavailableError, match="TimeoutError"):
        await llm.structured(task="t", system="s", prompt="p", output=Answer)

    assert cancelled.is_set()
    assert llm.available


async def test_no_key_means_unavailable() -> None:
    llm = PydanticAiLanguageModel(None, model_name="", timeout_sec=1, limit=DailyLimit(None, 1))

    assert not llm.available
    with pytest.raises(LlmUnavailableError):
        await llm.structured(task="t", system="s", prompt="p", output=Answer)


def test_text_part_is_importable() -> None:
    assert TextPart(content="ok").content == "ok"


@pytest.mark.parametrize("thinking", ["low", "medium"])
async def test_polza_keeps_model_id_and_sends_reasoning_effort(
    thinking: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    payloads: list[dict[str, Any]] = []

    def respond(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        payloads.append(body)
        name = body["tools"][0]["function"]["name"]
        return httpx.Response(
            200,
            json={
                "id": "mock",
                "object": "chat.completion",
                "created": 0,
                "model": body["model"],
                "choices": [
                    {
                        "index": 0,
                        "finish_reason": "tool_calls",
                        "message": {
                            "role": "assistant",
                            "tool_calls": [
                                {
                                    "id": "call_1",
                                    "type": "function",
                                    "function": {"name": name, "arguments": '{"value":42}'},
                                }
                            ],
                        },
                    }
                ],
                "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
            },
        )

    def client(**kwargs: Any) -> AsyncOpenAI:
        return AsyncOpenAI(
            **kwargs, http_client=httpx.AsyncClient(transport=httpx.MockTransport(respond))
        )

    monkeypatch.setattr(pydantic_ai_model, "AsyncOpenAI", client)
    monkeypatch.setattr(models, "ALLOW_MODEL_REQUESTS", True)  # MockTransport only, no network
    model = openai_compatible("https://polza.ai/api/v1", "mock-key", "openai/gpt-5.6-luna")
    llm = PydanticAiLanguageModel(
        model,
        model_name="openai/gpt-5.6-luna",
        thinking=thinking,  # type: ignore[arg-type]
        timeout_sec=5,
        limit=DailyLimit(None, 1),
    )
    result = await llm.structured(task="t", system="s", prompt="p", output=Answer)

    assert result.output.value == 42
    assert payloads[0]["model"] == "openai/gpt-5.6-luna"
    assert payloads[0]["reasoning_effort"] == thinking


async def test_bad_output_does_not_disable_other_tasks() -> None:
    attempts = 0

    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise UnexpectedModelBehavior("invalid output for this question")
        return _final(info, {"value": 2})

    llm = _llm(model)
    with pytest.raises(LlmUnavailableError):
        await llm.structured(task="t", system="s", prompt="bad", output=Answer)
    assert llm.available
    result = await llm.structured(task="t", system="s", prompt="good", output=Answer)
    assert result.output.value == 2
