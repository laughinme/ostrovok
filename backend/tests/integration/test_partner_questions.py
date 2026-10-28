import asyncio
from datetime import timedelta
from pathlib import Path

from app.db.database import Database
from app.db.models import DemandDaily
from app.domain.catalog import hotel_id
from app.service.knowledge.registry import RegistryLoader
from app.service.partner.questions import PartnerQuestions
from app.service.seed import run_seed
from app.service.seed_loaders import seed_loaders
from tests.factories import FakeClock
from tests.seed_data import write_region

DATA = Path(__file__).resolve().parents[2] / "data"
MAYAK = hotel_id("way/1")


async def partner_world(db: Database, tmp_path: Path) -> None:
    await run_seed(db, write_region(tmp_path), seed_loaders())
    async with db.unit_of_work() as uow:
        await RegistryLoader().load(uow, DATA)


async def test_questions_rank_weekly_demand_without_duplicates(
    db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    clock = FakeClock()
    async with db.unit_of_work() as uow:
        uow.session.add_all(
            [
                DemandDaily(
                    day=clock.now().date(), district="center", characteristic="blackout", count=34
                ),
                DemandDaily(
                    day=clock.now().date() - timedelta(days=7),
                    district="center",
                    characteristic="pets_policy",
                    count=100,
                ),
                DemandDaily(
                    day=clock.now().date() + timedelta(days=1),
                    district="center",
                    characteristic="pets_policy",
                    count=100,
                ),
            ]
        )

    async def ask() -> list[str]:
        async with db.unit_of_work() as uow:
            return [str(q.id) for q in await PartnerQuestions(uow, clock).generate(MAYAK)]

    first, second = await asyncio.gather(ask(), ask())
    assert first == second
    assert len(first) == 5
    async with db.unit_of_work() as uow:
        questions = await PartnerQuestions(uow, clock).of_hotel(MAYAK)
    assert questions[0].characteristic == "blackout"
    assert questions[0].value == 34
    assert "34 гостей" in questions[0].why
