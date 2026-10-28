import base64
import json

from fastapi import FastAPI
from httpx import AsyncClient
from pydantic_ai import ModelMessage, ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel
from sqlalchemy import select

from app.db.database import Database
from app.db.models import LlmCallRow
from app.infra.llm.cache import LlmCache
from app.infra.llm.guards import DailyLimit
from app.infra.llm.journal import LlmJournal
from app.infra.llm.pydantic_ai_model import PydanticAiLanguageModel

IMAGE = base64.b64encode(b"\x89PNG\r\n\x1a\nprivate-photo").decode()
PAYLOAD = {"image": IMAGE, "mediaType": "image/png"}


async def test_no_key_returns_recoverable_error(client: AsyncClient) -> None:
    response = await client.post("/api/v1/intents/photo", json=PAYLOAD)
    assert response.status_code == 503
    assert "опишите словами" in response.json()["detail"]


async def test_invalid_photo_is_rejected_before_llm(client: AsyncClient) -> None:
    response = await client.post("/api/v1/intents/photo", json={**PAYLOAD, "image": "bad"})
    assert response.status_code == 400


async def test_photo_is_cached_and_journaled_without_image(
    app: FastAPI, client: AsyncClient, db: Database
) -> None:
    calls = 0

    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        nonlocal calls
        calls += 1
        return ModelResponse(
            parts=[ToolCallPart(info.output_tools[0].name, {"text": "Хочу море из окна"})]
        )

    app.state.llm = PydanticAiLanguageModel(
        FunctionModel(model),
        model_name="gpt-5.4-mini",
        timeout_sec=2,
        limit=DailyLimit(None, 1),
        cache=LlmCache(db),
        journal=LlmJournal(db),
    )
    first = await client.post("/api/v1/intents/photo", json=PAYLOAD)
    again = await client.post("/api/v1/intents/photo", json=PAYLOAD)
    assert first.status_code == again.status_code == 200
    assert first.json() == {"text": "Хочу море из окна"}
    assert calls == 1
    async with db.raw_session() as session:
        rows = (await session.scalars(select(LlmCallRow).order_by(LlmCallRow.created_at))).all()
        assert [row.status for row in rows] == ["ok", "cached"]
        assert all(row.task == "photo_intent" for row in rows)
        assert rows[0].cost_usd > 0
        saved = json.dumps([(r.prompt, r.output, r.error, r.tool_calls) for r in rows])
        assert IMAGE not in saved
        assert "private-photo" not in saved
        assert "SHA-256" in saved


async def test_provider_failure_is_recoverable(app: FastAPI, client: AsyncClient) -> None:
    def model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        raise ConnectionError("provider unavailable")

    app.state.llm = PydanticAiLanguageModel(
        FunctionModel(model), model_name="fake", timeout_sec=2, limit=DailyLimit(None, 1)
    )
    response = await client.post("/api/v1/intents/photo", json=PAYLOAD)
    assert response.status_code == 503
    assert "опишите словами" in response.json()["detail"]
