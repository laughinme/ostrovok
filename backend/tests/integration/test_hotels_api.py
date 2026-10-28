from datetime import timedelta
from pathlib import Path

from httpx import AsyncClient

from app.db.database import Database
from app.domain.agents import AgentKind, Planner
from app.domain.catalog import hotel_id
from app.domain.knowledge.observation import Evidence, EvidenceKind, Observation
from app.domain.knowledge.scope import Facade, Scope
from app.domain.knowledge.sources import SourceKind
from app.service.agents.runtime import AgentRunner, Tracer, create_run
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import RegistryLoader
from app.service.ports import RecordingEventBus
from app.service.seed import run_seed
from app.service.seed_loaders import seed_loaders
from tests.factories import FakeClock
from tests.seed_data import write_region

DATA = Path(__file__).resolve().parents[2] / "data"
MAYAK = hotel_id("way/1")


async def _knowledge(db: Database, tmp_path: Path) -> None:
    await run_seed(db, write_region(tmp_path), seed_loaders())
    clock = FakeClock()
    async with db.unit_of_work() as uow:
        await RegistryLoader().load(uow, DATA)
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
                    method="горизонт по рельефу и зданиям",
                    observed_at=clock.now(),
                    valid_until=clock.now() + timedelta(days=365),
                    evidence=(
                        Evidence(
                            kind=EvidenceKind.HORIZON_PANORAMA,
                            summary="море видно в 82 из 100 симуляций",
                            attribution="© OpenStreetMap contributors",
                            params={"facade": "S", "floor": 4},
                        ),
                    ),
                )
            ],
            reason="расчёт вида",
        )


async def test_hotel_page_shows_facts_and_unknowns(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await _knowledge(db, tmp_path)

    hotels = (await client.get("/api/v1/hotels")).json()
    hotel = (await client.get(f"/api/v1/hotels/{MAYAK}")).json()

    assert {h["name"] for h in hotels} == {"Маяк", "Тихий двор"}
    assert hotel["area"] == "Центр"
    assert hotel["floors"] == 9
    fact = next(f for f in hotel["facts"] if f["characteristic"] == "sea_view")
    assert fact["statement"] == "Море видно из окон"
    assert fact["scopeText"] == "Ю-фасад, этаж 4 и выше"
    assert fact["scope"] == {"facades": ["S"], "floorFrom": 4}
    assert fact["confidenceLabel"] == "скорее да"
    assert fact["evidence"][0]["kind"] == "horizon_panorama"
    assert any(u["characteristic"] == "pets_policy" for u in hotel["unknowns"])

    detail = (await client.get(f"/api/v1/facts/{fact['id']}")).json()
    assert detail["sources"][0]["label"] == "расчёт"
    assert detail["history"][0]["reason"] == "расчёт вида"
    assert (await client.get(f"/api/v1/hotels/{hotel_id('way/404')}")).status_code == 404


async def test_characteristics_list_says_how_we_check(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await _knowledge(db, tmp_path)

    items = {c["key"]: c for c in (await client.get("/api/v1/characteristics")).json()}

    assert items["sea_view"]["how"] == "посчитаем"
    assert items["pets_policy"]["how"] == "спросим у отеля"


async def test_finished_run_replays_steps_over_sse(client: AsyncClient, db: Database) -> None:
    clock = FakeClock()
    async with db.unit_of_work() as uow:
        run_id = await create_run(
            uow, clock, agent=AgentKind.RESEARCHER, goal="изучить «Маяк»", planner=Planner.RULES
        )

    async def body(tracer: Tracer) -> None:
        await tracer.reason("рецепт view(sea)")
        await tracer.decide("готово")

    await AgentRunner(db, RecordingEventBus(), clock).run(run_id, body)

    run = (await client.get(f"/api/v1/runs/{run_id}")).json()
    async with client.stream("GET", f"/api/v1/runs/{run_id}/events") as response:
        text = "".join([chunk async for chunk in response.aiter_text()])

    assert run["status"] == "done"
    assert [s["kind"] for s in run["steps"]] == ["reason", "decision"]
    assert text.count("event: run.step") == 2
    assert "event: run.finished" in text


async def test_hotel_list_is_reused_until_facts_change(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await run_seed(db, write_region(tmp_path), seed_loaders())
    async with db.unit_of_work() as uow:
        await RegistryLoader().load(uow, DATA)
    before = await client.get("/api/v1/hotels")
    again = await client.get("/api/v1/hotels")
    await _knowledge(db, tmp_path)
    after = (await client.get("/api/v1/hotels")).json()

    assert before.content == again.content
    assert before.headers["content-type"] == "application/json"
    mayak = next(h for h in after if h["id"] == str(MAYAK))
    assert any(f["characteristic"] == "sea_view" for f in mayak["facts"])
