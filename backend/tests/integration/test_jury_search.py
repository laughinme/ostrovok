from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.db.database import Database
from app.db.models import Hotel
from tests.integration.conftest import AppFactory
from tests.integration.test_search_api import _world


@pytest.mark.parametrize(
    "text", ["Москва, тихий номер", "Казань, центр", "31 февраля", "100 взрослых и 25 детей"]
)
async def test_edited_frontend_intent_keeps_explanations(
    client: AsyncClient,
    db: Database,
    tmp_path: Path,
    text: str,
) -> None:
    await _world(db, tmp_path)
    parsed = await client.post("/api/v1/intents?planner=rules", json={"text": text})
    assert parsed.status_code == 200
    intent = parsed.json()
    assert intent["hints"]
    response = await client.post(
        "/api/v1/searches",
        json={
            "text": text,
            "chips": intent["chips"],
            "trip": intent["trip"],
            "useProfile": False,
        },
    )
    assert response.status_code == 201, response.text
    result = response.json()
    assert result["intent"]["hints"]
    if text.startswith(("Москва", "Казань")):
        assert not result["matches"]
        assert "Большом Сочи" in result["intent"]["hints"][0]


async def test_polyana_and_departure_city_are_in_scope(
    client: AsyncClient,
    db: Database,
    tmp_path: Path,
) -> None:
    await _world(db, tmp_path)
    result = await client.post("/api/v1/searches", json={"text": "из Москвы в Сочи, тихий номер"})
    assert result.status_code == 201
    assert result.json()["matches"]
    parsed = await client.post("/api/v1/intents", json={"text": "Красная Поляна, горы из окна"})
    assert parsed.json()["trip"]["area"] == "krasnaya_polyana"
    assert not any("Пока ищем" in h for h in parsed.json()["hints"])


async def test_intents_have_a_separate_limit_from_login(app_factory: AppFactory) -> None:
    async with app_factory(
        rate_limit_enabled=True, auth_rate_limit_per_minute=1, llm_rate_limit_per_minute=2
    ) as (_, client):
        for _ in range(2):
            assert (
                await client.post("/api/v1/intents?planner=rules", json={"text": "тихо"})
            ).status_code == 200
        assert (
            await client.post("/api/v1/intents?planner=rules", json={"text": "тихо"})
        ).status_code == 429


@pytest.mark.parametrize("text", ["", "   ", "\t\n", "а" * 2001])
async def test_blank_or_oversized_query_is_validation_error(client: AsyncClient, text: str) -> None:
    response = await client.post("/api/v1/intents?planner=rules", json={"text": text})
    assert response.status_code == 422


async def test_empty_budget_result_explains_how_to_continue(
    client: AsyncClient,
    db: Database,
    tmp_path: Path,
) -> None:
    await _world(db, tmp_path)
    async with db.unit_of_work() as uow:
        await uow.session.execute(update(Hotel).values(price_from_demo=5000))
    response = await client.post("/api/v1/searches", json={"text": "тихий номер до 1000 рублей"})
    assert response.status_code == 201
    assert response.json()["matches"] == []
    assert any("увеличить бюджет" in h for h in response.json()["intent"]["hints"])


async def test_unknown_prices_do_not_silently_confirm_the_budget(
    client: AsyncClient,
    db: Database,
    tmp_path: Path,
) -> None:
    await _world(db, tmp_path)
    response = await client.post("/api/v1/searches", json={"text": "тихий номер до 1000 рублей"})
    assert response.status_code == 201
    result = response.json()
    assert result["matches"]
    assert all(m["priceFromDemo"] is None for m in result["matches"])
    assert any("Соответствие бюджету не подтверждено" in h for h in result["intent"]["hints"])
