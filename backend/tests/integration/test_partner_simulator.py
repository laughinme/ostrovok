from collections.abc import Mapping
from datetime import timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.db.database import Database
from app.db.models import Job, ObservationRow
from app.domain.jobs import JobKind
from app.domain.knowledge.observation import Observation
from app.domain.knowledge.scope import Facade, Scope
from app.domain.knowledge.sources import SourceKind
from app.service.knowledge.recorder import KnowledgeStore
from app.service.partner.claims import seed_demo_claims
from app.service.partner.questions import PartnerQuestions
from app.service.partner.simulation import schedule_simulation
from app.service.partner.simulator import HotelierSimulator
from app.service.ports import RecordingEventBus
from tests.factories import FakeClock
from tests.integration.test_partner_questions import MAYAK, partner_world


class DemoTruth:
    def profile(self, osm_id: str) -> Mapping[str, Any] | None:
        return {"soundproofing": True, "claims": {"sea_view_all_rooms": True}}

    def claimed_hotels(self) -> tuple[str, ...]:
        return ("way/1",)


async def test_simulator_is_delayed_and_records_only_demo_observations(
    db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    clock = FakeClock()
    async with db.unit_of_work() as uow:
        questions = await PartnerQuestions(uow, clock).generate(MAYAK)
        assert await schedule_simulation(uow, clock, MAYAK, (10, 10)) == 5
        assert await schedule_simulation(uow, clock, MAYAK, (10, 10)) == 0
        jobs = list(
            await uow.session.scalars(select(Job).where(Job.kind == JobKind.HOTELIER_SIMULATE))
        )
        assert len(jobs) == 5
        assert all(j.available_at == clock.now() + timedelta(seconds=10) for j in jobs)
        question = next(q for q in questions if q.characteristic == "soundproofing")
    bus = RecordingEventBus()
    simulator = HotelierSimulator(db, clock, bus, DemoTruth())
    await simulator.respond(question.id)
    await simulator.respond(question.id)
    async with db.unit_of_work() as uow:
        rows = list(await uow.session.scalars(select(ObservationRow)))
        assert len(rows) == 1
        assert rows[0].is_demo
        assert rows[0].source == "hotelier"
    assert any(event["type"] == "fact.changed" for _, event in bus.published)


async def test_claims_create_physical_conflict_and_facade_question(
    db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    clock = FakeClock()
    async with db.unit_of_work() as uow:
        await KnowledgeStore(uow, clock).record(
            [
                Observation(
                    hotel_id=MAYAK,
                    characteristic="sea_view",
                    characteristic_version=1,
                    scope=Scope(facades=frozenset({Facade.S}), floor_from=4),
                    value=True,
                    confidence=0.82,
                    source=SourceKind.COMPUTED,
                    source_ref="method:view@1",
                    method="test",
                    observed_at=clock.now(),
                ),
                Observation(
                    hotel_id=MAYAK,
                    characteristic="sea_view",
                    characteristic_version=1,
                    scope=Scope(facades=frozenset({Facade.N})),
                    value=False,
                    confidence=0.95,
                    source=SourceKind.COMPUTED,
                    source_ref="method:view@1",
                    method="test",
                    observed_at=clock.now(),
                ),
            ],
            reason="test",
        )
    assert await seed_demo_claims(db, clock, DemoTruth()) == 1
    assert await seed_demo_claims(db, clock, DemoTruth()) == 0
    async with db.unit_of_work() as uow:
        conflicts = await uow.knowledge.open_conflicts(MAYAK, "sea_view")
        assert conflicts
        assert conflicts[0].status == "waiting_hotel"
        questions = await PartnerQuestions(uow, clock).of_hotel(MAYAK)
        mapping = next(q for q in questions if q.characteristic == "facade_rooms")
        assert "южную сторону" in mapping.text
        assert conflicts[0].question_id == mapping.id
