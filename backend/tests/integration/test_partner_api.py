from pathlib import Path

from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy import select

from app.db.database import Database
from app.db.models import DemandDaily, ObservationRow, RoomType
from app.domain.catalog import hotel_id
from app.domain.knowledge.observation import Observation
from app.domain.knowledge.scope import Facade, Scope
from app.domain.knowledge.sources import SourceKind
from app.service.knowledge.recorder import KnowledgeStore
from tests.factories import FakeClock
from tests.integration.test_partner_questions import MAYAK, partner_world

YARD = hotel_id("way/2")


async def login_partner(client: AsyncClient) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/demo", json={"persona": "hotelier_mayak"}, headers={"X-Client": "mobile"}
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def test_questions_and_answers_are_camel_case_and_change_facts(
    client: AsyncClient, app: FastAPI, db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    clock = FakeClock()
    app.state.clock = clock
    async with db.unit_of_work() as uow:
        uow.session.add(
            DemandDaily(
                day=clock.now().date(), district="center", characteristic="blackout", count=34
            )
        )
    headers = await login_partner(client)
    response = await client.get(f"/api/v1/partner/hotels/{MAYAK}/questions", headers=headers)
    assert response.status_code == 200, response.text
    question = response.json()[0]
    assert question["characteristic"] == "blackout"
    assert question["answerKind"] == "choice"
    response = await client.post(
        f"/api/v1/partner/questions/{question['id']}/answers",
        headers=headers,
        json={"text": "Кажется, шторы хорошие"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["clarification"]
    assert response.json()["changedFacts"] == []
    response = await client.post(
        f"/api/v1/partner/questions/{question['id']}/answers",
        headers=headers,
        json={"choice": "Нет"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["parseConfidence"] == 1
    assert response.json()["changedFacts"][0]["value"] is False
    overview = (await client.get(f"/api/v1/partner/hotels/{MAYAK}", headers=headers)).json()
    assert overview["coverage"]["known"] == 1
    fact_id = overview["facts"][0]["id"]
    confirmed = await client.post(f"/api/v1/partner/facts/{fact_id}/confirm", headers=headers)
    assert confirmed.status_code == 200, confirmed.text
    corrected = await client.post(
        f"/api/v1/partner/facts/{fact_id}/correct", headers=headers, json={"value": True}
    )
    assert corrected.status_code == 200, corrected.text
    assert corrected.json()["changedFacts"][0]["value"] is True
    demand = await client.get(f"/api/v1/partner/hotels/{MAYAK}/demand", headers=headers)
    assert demand.json()["items"][0] == {"characteristic": "blackout", "count": 34}
    notifications = await client.get(
        f"/api/v1/partner/hotels/{MAYAK}/notifications", headers=headers
    )
    assert notifications.status_code == 200
    async with db.unit_of_work() as uow:
        observations = list(await uow.session.scalars(select(ObservationRow)))
        assert observations
        assert all(o.source == "hotelier" for o in observations)
        assert all(not o.is_demo for o in observations)


async def test_facade_markup_changes_search_room_recommendation(
    client: AsyncClient, app: FastAPI, db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    app.state.clock = FakeClock()
    async with db.unit_of_work() as uow:
        uow.session.add_all(
            [
                RoomType(
                    id=name, hotel_id=MAYAK, name=name, area=25, bed="double", capacity=2, rates=[]
                )
                for name in ("suite", "standard")
            ]
        )
        await KnowledgeStore(uow, FakeClock()).record(
            [
                Observation(
                    hotel_id=MAYAK,
                    characteristic="sea_view",
                    characteristic_version=1,
                    scope=Scope(facades=frozenset({Facade.S}), floor_from=4),
                    value=True,
                    confidence=0.9,
                    source=SourceKind.COMPUTED,
                    source_ref="view:test",
                    method="test",
                    observed_at=FakeClock().now(),
                ),
            ],
            reason="test",
        )
    headers = await login_partner(client)
    search = (await client.post("/api/v1/searches", json={"text": "Вид на море"})).json()
    before = next(m for m in search["matches"] if m["hotelId"] == str(MAYAK))
    assert before["recommendation"]["roomTypeId"] is None
    response = await client.put(
        f"/api/v1/partner/hotels/{MAYAK}/facades",
        headers=headers,
        json={
            "mappings": [
                {"roomTypeId": "suite", "facade": "S", "floorFrom": 4, "floorTo": 8},
                {"roomTypeId": "standard", "facade": "N", "floorFrom": 1, "floorTo": 3},
            ]
        },
    )
    assert response.status_code == 200, response.text
    search = (await client.get(f"/api/v1/searches/{search['searchId']}")).json()
    after = next(m for m in search["matches"] if m["hotelId"] == str(MAYAK))
    assert after["recommendation"]["roomTypeId"] == "suite"
    assert after["recommendation"]["confirmedByHotel"] is True


async def test_facade_answer_form_and_invalid_correction_scope(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    async with db.unit_of_work() as uow:
        uow.session.add(
            RoomType(
                id="suite", hotel_id=MAYAK, name="Люкс", area=25, bed="double", capacity=2, rates=[]
            )
        )
    headers = await login_partner(client)
    questions = (
        await client.get(f"/api/v1/partner/hotels/{MAYAK}/questions", headers=headers)
    ).json()
    question = next(q for q in questions if q["characteristic"] == "facade_rooms")
    response = await client.post(
        f"/api/v1/partner/questions/{question['id']}/answers",
        headers=headers,
        json={"mappings": [{"roomTypeId": "suite", "facade": "S", "floorFrom": 4, "floorTo": 8}]},
    )
    assert response.status_code == 200, response.text
    fact_id = response.json()["changedFacts"][0]["id"]
    response = await client.post(f"/api/v1/partner/facts/{fact_id}/confirm", headers=headers)
    assert response.status_code == 200, response.text
    question = next(q for q in questions if q["characteristic"] == "soundproofing")
    response = await client.post(
        f"/api/v1/partner/questions/{question['id']}/answers", headers=headers, json={"value": True}
    )
    fact_id = response.json()["changedFacts"][0]["id"]
    response = await client.post(
        f"/api/v1/partner/facts/{fact_id}/correct",
        headers=headers,
        json={"value": False, "scope": {"floorFrom": 99}},
    )
    assert response.status_code == 400, response.text
