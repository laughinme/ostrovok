import json

import pytest
from pydantic import BaseModel
from pydantic_ai import ModelMessage, ModelResponse, TextPart, ToolCallPart, models
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.infra.llm.guards import DailyLimit
from app.infra.llm.pydantic_ai_model import PydanticAiLanguageModel
from app.service.ports import Budget, LlmUnavailableError, ToolSpec

models.ALLOW_MODEL_REQUESTS = False


class Answer(BaseModel):
    value: int


class Probe(BaseModel):
    tag: str


def _llm(function: object, *, limit: int = 10) -> PydanticAiLanguageModel:
    return PydanticAiLanguageModel(
        FunctionModel(function),  # type: ignore[arg-type]
        model_name="fake",
        timeout_sec=5,
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


async def test_no_key_means_unavailable() -> None:
    llm = PydanticAiLanguageModel(None, model_name="", timeout_sec=1, limit=DailyLimit(None, 1))

    assert not llm.available
    with pytest.raises(LlmUnavailableError):
        await llm.structured(task="t", system="s", prompt="p", output=Answer)


def test_text_part_is_importable() -> None:
    assert TextPart(content="ok").content == "ok"
