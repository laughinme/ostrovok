import shutil
from pathlib import Path
from uuid import UUID

from httpx import AsyncClient
from sqlalchemy import text

from app.bootstrap import build_agents
from app.db.database import Database
from app.domain.catalog import hotel_id
from app.service.knowledge.registry import RegistryLoader
from app.service.ports import RecordingEventBus
from app.service.seed import run_seed
from app.service.seed_loaders import seed_loaders
from tests.factories import FakeClock
from tests.integration.conftest import AppFactory
from tests.seed_data import write_region

DATA = Path(__file__).resolve().parents[2] / "data"
MAYAK = hotel_id("way/1")


async def _operator(client: AsyncClient) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/demo", json={"persona": "operator"}, headers={"X-Client": "mobile"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def test_built_house_is_noticed_and_recomputed(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await run_seed(db, write_region(tmp_path), seed_loaders())
    async with db.unit_of_work() as uow:
        await RegistryLoader().load(uow, DATA)
    headers = await _operator(client)

    started = await client.post(
        "/api/v1/console/world/buildings",
        json={"lon": 39.7200, "lat": 43.5796, "floors": 9, "title": "Новый дом у «Маяка»"},
        headers=headers,
    )
    assert started.status_code == 202, started.text
    body = started.json()

    agents = build_agents(db, RecordingEventBus(), FakeClock(), DATA)
    await agents.watcher.react(UUID(body["runId"]), UUID(body["changeId"]))

    run = (await client.get(f"/api/v1/runs/{body['runId']}")).json()
    feed = (await client.get("/api/v1/console/changes", headers=headers)).json()
    assert run["status"] == "done", run["steps"][-2:]
    assert run["steps"][0]["tool"] == "world.affected"
    assert feed[0]["title"] == "Новый дом у «Маяка»"
    assert str(MAYAK) in feed[0]["affectedHotels"]


async def test_guests_cannot_open_the_console(
    client: AsyncClient, db: Database, tmp_path: Path
) -> None:
    await run_seed(db, write_region(tmp_path), seed_loaders())
    guest = await client.post(
        "/api/v1/auth/demo", json={"persona": "guest_anna"}, headers={"X-Client": "mobile"}
    )
    token = guest.json()["access_token"]

    response = await client.get(
        "/api/v1/console/registry", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403


async def test_demo_reset_forgets_what_happened_during_the_take(
    app_factory: AppFactory, tmp_path: Path
) -> None:
    region = write_region(tmp_path)
    (region / "registry").mkdir()
    shutil.copy(DATA / "registry" / "characteristics.yaml", region / "registry")
    async with app_factory(data_dir=region) as (app, client):
        db: Database = app.state.db
        await run_seed(db, region, seed_loaders())
        async with db.unit_of_work() as uow:
            await RegistryLoader().load(uow, DATA)
        headers = await _operator(client)
        await client.post("/api/v1/searches", json={"text": "Тихо ночью"})
        await client.post(
            "/api/v1/console/world/buildings",
            json={"lon": 39.72, "lat": 43.5796, "floors": 9},
            headers=headers,
        )

        response = await client.post("/api/v1/console/demo/reset", headers=headers)

        assert response.status_code == 200, response.text
        assert (await client.get("/api/v1/console/changes", headers=headers)).json() == []
        async with db.unit_of_work() as uow:
            left = await uow.session.execute(text("SELECT count(*) FROM searches"))
            assert left.scalar_one() == 0
