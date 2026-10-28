from dataclasses import replace
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

from httpx import AsyncClient
from sqlalchemy import update

from app.db.database import Database
from app.db.models import FactRow
from app.domain.knowledge.scope import Facade, Scope
from app.service.knowledge.recorder import KnowledgeStore
from app.service.search.moods import MoodQueries, load_moods
from tests.factories import FakeClock
from tests.integration.test_search_api import DATA, MAYAK, YARD, _obs, _world


def _by_id(rows: list[dict[str, object]]) -> dict[str, dict[str, object]]:
    return {str(row["id"]): row for row in rows}


async def test_moods_change_with_facts_and_chips_can_be_searched(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await _world(db, tmp_path)
    before = _by_id((await client.get("/api/v1/moods?month=11")).json())
    assert len(before) == 8
    assert before["mountains"]["count"] == 0
    assert before["work"]["count"] == 0
    async with db.unit_of_work() as uow:
        await KnowledgeStore(uow, FakeClock()).record(
            [
                _obs(MAYAK, "mountain_view", Scope.everywhere(), True, 0.9),
                _obs(MAYAK, "day_noise", Scope(facades=frozenset({Facade.S})), True, 0.9),
            ],
            reason="new research",
        )
    response = await client.get("/api/v1/moods?month=11")
    assert response.status_code == 200, response.text
    after = _by_id(response.json())
    assert after["mountains"]["count"] == 1
    assert after["work"]["count"] == 1
    assert str(after["mountains"]["countLabel"]).startswith("1 отель")
    assert after["mountains"]["month"] == 11
    search = await client.post(
        "/api/v1/searches",
        json={
            "chips": after["mountains"]["chips"],
            "trip": {"month": 11},
            "useProfile": False,
        },
    )
    assert search.status_code == 201, search.text
    assert search.json()["matches"][0]["hotelId"] == str(MAYAK)


async def test_moods_exclude_expired_conflicting_and_unconfirmed_facts(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await _world(db, tmp_path)
    async with db.unit_of_work() as uow:
        await KnowledgeStore(uow, FakeClock()).record(
            [
                replace(
                    _obs(MAYAK, "mountain_view", Scope.everywhere(), True, 0.9),
                    valid_until=FakeClock().now() - timedelta(days=1),
                ),
                _obs(YARD, "mountain_view", Scope.everywhere(), True, 0.9),
            ],
            reason="expired and conflicting facts",
        )
        await uow.session.execute(
            update(FactRow)
            .where(FactRow.hotel_id == YARD, FactRow.characteristic == "mountain_view")
            .values(status="conflict")
        )
    async with db.unit_of_work() as uow:
        results = await MoodQueries(uow, FakeClock(), DATA).all(month=11)
    assert next(r.count for r in results if r.mood.id == "mountains") == 0


async def test_moods_share_one_fact_query_and_support_seasons(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await _world(db, tmp_path)
    async with db.unit_of_work() as uow:
        await KnowledgeStore(uow, FakeClock()).record(
            [
                _obs(MAYAK, "sunset_over_sea", Scope(months=frozenset({11})), True, 0.9),
            ],
            reason="winter sunset",
        )
    async with db.unit_of_work() as uow:
        with patch.object(uow.session, "execute", wraps=uow.session.execute) as execute:
            winter = await MoodQueries(uow, FakeClock(), DATA).all()
        statements = [str(call.args[0]) for call in execute.await_args_list]
    assert sum("FROM facts" in statement for statement in statements) == 1
    assert next(r.count for r in winter if r.mood.id == "sunset") == 1
    summer = _by_id((await client.get("/api/v1/moods?month=7")).json())
    assert summer["sunset"]["count"] == 0
    assert (await client.get("/api/v1/moods?month=13")).status_code == 422
    assert all(m.chips for m in load_moods(DATA))
