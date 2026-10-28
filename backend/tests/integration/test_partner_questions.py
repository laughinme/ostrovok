import asyncio
from datetime import timedelta
from pathlib import Path

from sqlalchemy import text

from app.db.database import Database
from app.db.models import DemandDaily, SearchRow
from app.domain.catalog import hotel_id
from app.domain.search.intent import parse_intent
from app.service.knowledge.registry import RegistryLoader
from app.service.partner.demand import PartnerDemand
from app.service.partner.questions import PartnerQuestions
from app.service.search.intents import IntentParser
from app.service.search.search import SearchService, top_hotels
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


async def test_question_deduplication_works_with_generic_prepared_plans(
    db: Database, tmp_path: Path
) -> None:
    await partner_world(db, tmp_path)
    async with db.unit_of_work() as uow:
        await uow.session.execute(text("SET LOCAL plan_cache_mode = force_generic_plan"))
        questions = await PartnerQuestions(uow, FakeClock()).generate(MAYAK)
        assert len(questions) == 5


async def test_demand_influence_reads_the_stored_top(db: Database, tmp_path: Path) -> None:
    await partner_world(db, tmp_path)
    clock = FakeClock()
    async with db.unit_of_work() as uow:
        registry = await IntentParser(uow, DATA).vocabulary()
        intent = parse_intent("ночью тихо, вид на море", registry, today=clock.now().date())
        view = await SearchService(uow, clock).search(intent, use_profile=False)
        row = await uow.session.get(SearchRow, view.id)
        assert row is not None
        assert str(MAYAK) in (top_hotels(row) or [])
        influence = await PartnerDemand(uow, clock).influence(MAYAK, "center")

    assert influence["night_noise"] == 1.0
