"""Every LLM call lands in the journal (answers, cache hits, failures); the console reads it."""

import pytest
from pydantic import BaseModel
from pydantic_ai import ModelMessage, ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.db.database import Database
from app.infra.llm.cache import LlmCache
from app.infra.llm.guards import DailyLimit
from app.infra.llm.journal import LlmJournal
from app.infra.llm.pydantic_ai_model import PydanticAiLanguageModel
from app.service.ports import LlmUnavailableError
from tests.factories import promote, register
from tests.integration.conftest import AppFactory


class Chips(BaseModel):
    keys: list[str]


def _answer(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, {"keys": ["sea_view"]})])


def _broken(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    raise RuntimeError("provider is down")


def _llm(db: Database, function: object, *, name: str = "gpt-5.4-mini") -> PydanticAiLanguageModel:
    return PydanticAiLanguageModel(
        FunctionModel(function),  # type: ignore[arg-type]
        model_name=name,
        timeout_sec=5,
        limit=DailyLimit(None, 10),
        cache=LlmCache(db),
        journal=LlmJournal(db),
    )


async def test_calls_are_journaled_and_priced(app_factory: AppFactory) -> None:
    async with app_factory() as (app, client):
        db: Database = app.state.db
        llm = _llm(db, _answer)
        first = await llm.structured(task="intent", system="s", prompt="море", output=Chips)
        again = await llm.structured(task="intent", system="s", prompt="море", output=Chips)
        with pytest.raises(LlmUnavailableError):
            await _llm(db, _broken, name="other").structured(
                task="answer", system="s", prompt="?", output=Chips
            )
        operator = await register(client)
        await promote(db, operator.email)

        calls = (await client.get("/api/v1/console/llm/calls", headers=operator.headers)).json()
        usage = (await client.get("/api/v1/console/llm/usage", headers=operator.headers)).json()

    assert first.usage.cost_usd > 0
    assert first.latency_ms >= 0
    assert again.cached
    assert [c["status"] for c in calls] == ["failed", "cached", "ok"]
    assert calls[2]["output"] == {"keys": ["sea_view"]}
    assert calls[2]["prompt"] == "море"
    assert "provider is down" in calls[0]["error"]
    intent = next(s for s in usage["today"] if s["task"] == "intent")
    assert (intent["calls"], intent["cached"], intent["failed"]) == (2, 1, 0)
    assert usage["totalCostUsd"] == round(first.usage.cost_usd, 4)


async def test_journal_is_for_operators(app_factory: AppFactory) -> None:
    async with app_factory() as (_, client):
        guest = await register(client)
        response = await client.get("/api/v1/console/llm/calls", headers=guest.headers)

    assert response.status_code == 403
