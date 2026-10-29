from datetime import timedelta
from pathlib import Path

from sqlalchemy import text

from app.db.database import Database
from app.domain.catalog import hotel_id
from app.domain.knowledge.observation import Observation
from app.domain.knowledge.scope import Scope
from app.domain.knowledge.sources import SourceKind
from app.service.agents.freshness import FreshnessScan
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import RegistryLoader
from app.service.seed import run_seed
from app.service.seed_loaders import seed_loaders
from tests.factories import FakeClock
from tests.seed_data import write_region

DATA = Path(__file__).resolve().parents[2] / "data"


async def test_expiring_facts_are_queued_for_a_recheck(db: Database, tmp_path: Path) -> None:
    await run_seed(db, write_region(tmp_path), seed_loaders())
    clock = FakeClock()
    async with db.unit_of_work() as uow:
        await RegistryLoader().load(uow, DATA)
        await KnowledgeStore(uow, clock).record(
            [
                Observation(
                    hotel_id=hotel_id("way/1"),
                    characteristic="pharmacy_24_7",
                    characteristic_version=1,
                    scope=Scope.everywhere(),
                    value=True,
                    confidence=0.85,
                    source=SourceKind.OPEN_DATA,
                    source_ref="method:poi_nearby@1",
                    method="test",
                    observed_at=clock.now(),
                    valid_until=clock.now() + timedelta(days=90),
                )
            ],
            reason="test",
        )

    assert await FreshnessScan(db, clock).run() == 0
    clock.advance(timedelta(days=80))
    assert await FreshnessScan(db, clock).run() == 1
    assert await FreshnessScan(db, clock).run() == 0

    async with db.unit_of_work() as uow:
        payload = await uow.session.scalar(
            text("SELECT payload FROM jobs WHERE kind = 'research.collect'")
        )
    assert payload["keys"] == ["pharmacy_24_7"]
