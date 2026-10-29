import pytest
from pydantic import BaseModel, Field
from pydantic_ai import ModelMessage, ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.db.database import Database
from app.infra.llm.cache import LlmCache, cache_key, schema_fingerprint
from app.infra.llm.guards import DailyLimit
from app.infra.llm.journal import LlmJournal
from app.infra.llm.pydantic_ai_model import CACHE_VERSION, PydanticAiLanguageModel
from app.service.ports import LlmUnavailableError
from tests.factories import promote, register
from tests.integration.conftest import AppFactory


class Chips(BaseModel):
    keys: list[str]


def _answer(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, {"keys": ["sea_view"]})])


def _broken(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
    raise RuntimeError("provider is down")


def _llm(
    db: Database, function: object, *, name: str = "gpt-5.4-mini", provider: str = ""
) -> PydanticAiLanguageModel:
    return PydanticAiLanguageModel(
        FunctionModel(function),  # type: ignore[arg-type]
        model_name=name,
        provider_url=provider,
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
    assert again.usage == first.usage
    assert again.latency_ms == first.latency_ms
    assert again.spent.cost_usd == 0
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


async def test_cache_does_not_cross_provider_boundaries(db: Database) -> None:
    first = _llm(db, _answer, provider="https://first.example/v1")
    second = _llm(db, _broken, provider="https://second.example/v1")
    await first.structured(task="intent", system="s", prompt="same", output=Chips)
    with pytest.raises(LlmUnavailableError):
        await second.structured(task="intent", system="s", prompt="same", output=Chips)


async def test_cache_before_profile_fix_is_not_reused(db: Database) -> None:
    key = cache_key("", "fake", "default", "intent", "s", "p", schema_fingerprint(Chips), "[]")
    await LlmCache(db).put(
        key, model="fake", task="intent", output={"keys": ["wrong_legacy_answer"]}, usage={}
    )

    result = await _llm(db, _answer, name="fake").structured(
        task="intent", system="s", prompt="p", output=Chips
    )

    assert result.output.keys == ["sea_view"]
    assert not result.cached


class Dates(BaseModel):
    from_: str | None = Field(None, alias="from")


async def test_legacy_cache_preserves_aliased_fields(db: Database) -> None:
    key = cache_key(
        CACHE_VERSION, "", "fake", "default", "intent", "s", "p", schema_fingerprint(Dates), "[]"
    )
    cache = LlmCache(db)
    await cache.put(key, model="fake", task="intent", output={"from_": "2026-11-12"}, usage={})
    llm = PydanticAiLanguageModel(
        FunctionModel(_broken),
        model_name="fake",
        timeout_sec=1,
        limit=DailyLimit(None, 0),
        cache=cache,
        cache_only=True,
    )
    result = await llm.structured(task="intent", system="s", prompt="p", output=Dates)
    assert result.output.from_ == "2026-11-12"
    assert result.cached
    with pytest.raises(LlmUnavailableError, match="no cached answer"):
        await llm.structured(task="intent", system="s", prompt="missing", output=Dates)


async def test_cache_round_trip_keeps_aliases(db: Database) -> None:
    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, {"from": "2026-11-12"})]
        )

    llm = _llm(db, model)
    first = await llm.structured(task="intent", system="s", prompt="dates", output=Dates)
    cached = await llm.structured(task="intent", system="s", prompt="dates", output=Dates)
    assert first.output == cached.output
    assert cached.output.from_ == "2026-11-12"
