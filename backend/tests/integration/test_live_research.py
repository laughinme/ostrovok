from pathlib import Path

from httpx import AsyncClient

from app.bootstrap import build_agents
from app.db.database import Database
from app.domain.catalog import hotel_id
from app.service.knowledge.registry import RegistryLoader
from app.service.ports import RecordingEventBus
from app.service.seed import run_seed
from app.service.seed_loaders import seed_loaders
from tests.factories import FakeClock
from tests.seed_data import write_region

DATA = Path(__file__).resolve().parents[2] / "data"
MAYAK = hotel_id("way/1")


async def test_khinkali_wish_is_learned_computed_and_shown(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    region = write_region(tmp_path)
    await run_seed(db, region, seed_loaders())
    async with db.unit_of_work() as uow:
        await RegistryLoader().load(uow, DATA)
    search = (await client.post("/api/v1/searches", json={"text": "Тихо ночью"})).json()

    started = await client.post(
        f"/api/v1/searches/{search['searchId']}/wishes",
        json={"text": "Хинкальная рядом, минут 10 пешком"},
    )
    assert started.status_code == 202, started.text
    run_id = started.json()["runId"]
    chip = started.json()["search"]["intent"]["chips"][-1]
    assert chip["characteristic"] is None

    bus = RecordingEventBus()
    agents = build_agents(db, bus, FakeClock(), DATA)
    claimed = await _claim(db)
    await agents.wishes.run(
        claimed["run_id"], claimed["search_id"], claimed["chip_ids"], claimed["hotel_ids"]
    )

    run = (await client.get(f"/api/v1/runs/{run_id}")).json()
    tools = [s["tool"] for s in run["steps"] if s["tool"]]
    assert run["status"] == "done", run["steps"][-3:]
    assert {"recipe.validate", "osm.tag_stats", "recipe.dry_run", "osm.find"} <= set(tools)
    after = (await client.get(f"/api/v1/searches/{search['searchId']}")).json()
    learned = after["intent"]["chips"][-1]
    assert learned["characteristic"]
    mayak = next(m for m in after["matches"] if m["hotelId"] == str(MAYAK))
    verdict = next(r for r in mayak["perChip"] if r["chipId"] == learned["id"])
    assert verdict["verdict"] == "yes", verdict
    assert (
        "search:" + search["searchId"],
        {"type": "search.updated", "searchId": search["searchId"]},
    ) in bus.published


async def _claim(db: Database) -> dict[str, object]:
    from datetime import timedelta  # noqa: PLC0415
    from uuid import UUID  # noqa: PLC0415

    async with db.unit_of_work() as uow:
        (job,) = await uow.jobs.claim(
            limit=1,
            now=FakeClock().now() + timedelta(days=3650),
            lease=timedelta(minutes=1),
            worker="t",
        )
        return {
            "run_id": job.run_id,
            "search_id": UUID(job.payload["search_id"]),
            "chip_ids": job.payload["chip_ids"],
            "hotel_ids": [UUID(h) for h in job.payload["hotel_ids"]],
        }
