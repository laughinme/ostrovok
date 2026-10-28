from pathlib import Path

import pytest
from httpx import AsyncClient

from app.db.database import Database
from app.domain.catalog import hotel_id
from app.domain.knowledge.observation import Observation
from app.domain.knowledge.scope import Scope
from app.domain.knowledge.sources import SourceKind
from app.service.knowledge.recorder import KnowledgeStore
from app.service.partner.questions import PartnerQuestions
from tests.factories import FakeClock
from tests.integration.test_partner_api import login_partner
from tests.integration.test_partner_questions import MAYAK, partner_world

FOREIGN = hotel_id("way/2")


@pytest.mark.parametrize("suffix", ["", "/questions", "/requests", "/demand", "/notifications"])
async def test_hotelier_cannot_read_other_hotels(
    client: AsyncClient, db: Database, tmp_path: Path, suffix: str
) -> None:
    await partner_world(db, tmp_path)
    headers = await login_partner(client)
    response = await client.get(f"/api/v1/partner/hotels/{FOREIGN}{suffix}", headers=headers)
    assert response.status_code == 403
    assert response.json()["error_code"] == "NOT_HOTEL_STAFF"


async def test_hotelier_cannot_mutate_foreign_facts_questions_or_facades(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    clock = FakeClock()
    async with db.unit_of_work() as uow:
        result = await KnowledgeStore(uow, clock).record(
            [
                Observation(
                    hotel_id=FOREIGN,
                    characteristic="blackout",
                    characteristic_version=1,
                    scope=Scope(),
                    value=True,
                    confidence=0.9,
                    source=SourceKind.COMPUTED,
                    source_ref="test",
                    method="test",
                    observed_at=clock.now(),
                ),
            ],
            reason="test",
        )
        fact_id = result.changed_facts[0].id
        question = (await PartnerQuestions(uow, clock).generate(FOREIGN))[0]
    headers = await login_partner(client)
    calls = [
        (f"/api/v1/partner/facts/{fact_id}/confirm", {}),
        (f"/api/v1/partner/facts/{fact_id}/correct", {"value": False}),
        (f"/api/v1/partner/questions/{question.id}/answers", {"text": "Да"}),
    ]
    for path, payload in calls:
        response = await client.post(path, headers=headers, json=payload)
        assert response.status_code == 403, response.text
    response = await client.put(
        f"/api/v1/partner/hotels/{FOREIGN}/facades",
        headers=headers,
        json={"mappings": [{"roomTypeId": "foreign", "facade": "S", "floorFrom": 1, "floorTo": 2}]},
    )
    assert response.status_code == 403


async def test_guest_cannot_enter_partner_cabinet(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    auth = await client.post(
        "/api/v1/auth/demo", json={"persona": "guest_anna"}, headers={"X-Client": "mobile"}
    )
    response = await client.get(
        f"/api/v1/partner/hotels/{MAYAK}",
        headers={"Authorization": f"Bearer {auth.json()['access_token']}"},
    )
    assert response.status_code == 403
