import asyncio
import csv
import gzip
import shutil
from datetime import timedelta
from pathlib import Path
from uuid import UUID

import pytest
from geoalchemy2.shape import to_shape
from httpx import AsyncClient
from sqlalchemy import func, select

from app.bootstrap import build_agents
from app.db.database import Database
from app.db.models import AgentRunRow, Hotel, HotelierQuestion, Job
from app.domain.catalog import building_facades, hotel_id
from app.domain.jobs import JobKind
from app.service.agents.collect import CollectService
from app.service.agents.liaison import Liaison
from app.service.jobs import JobRunner
from app.service.knowledge.registry import RegistryLoader
from app.service.ports import RecordingEventBus
from app.service.seed import run_seed
from app.service.seed_loaders import seed_loaders
from app.worker import build_handlers
from tests.factories import FakeClock
from tests.integration.conftest import AppFactory
from tests.seed_data import write_region

DATA = Path(__file__).resolve().parents[2] / "data"
RESERVE_ID = "way/3"


def _data(tmp_path: Path) -> Path:
    data = write_region(tmp_path)
    (data / "registry").mkdir()
    shutil.copy(DATA / "registry/characteristics.yaml", data / "registry/characteristics.yaml")
    with gzip.open(data / "region/hotels.csv.gz", "rt") as source:
        row = next(csv.DictReader(source))
    row.update(osm_id=RESERVE_ID, name="Резервный отель", building_osm_id=RESERVE_ID)
    with gzip.open(data / "region/reserve_hotels.csv.gz", "wt") as target:
        writer = csv.DictWriter(target, fieldnames=list(row))
        writer.writeheader()
        writer.writerow(row)
    return data


async def _headers(client: AsyncClient, persona: str = "operator") -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/demo", json={"persona": persona}, headers={"X-Client": "mobile"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def _seed(db: Database, data: Path) -> None:
    await run_seed(db, data, seed_loaders())
    async with db.unit_of_work() as uow:
        await RegistryLoader().load(uow, data)


async def test_onboarding_research_questions_search_and_reset(
    app_factory: AppFactory, tmp_path: Path
) -> None:
    data = _data(tmp_path)
    async with app_factory(data_dir=data) as (app, client):
        db = app.state.db
        await _seed(db, data)
        headers = await _headers(client)
        assert len((await client.get("/api/v1/hotels")).json()) == 2
        reserve = await client.get("/api/v1/console/hotels/reserve", headers=headers)
        assert reserve.status_code == 200
        assert reserve.json()[0]["osmId"] == RESERVE_ID
        started = await client.post(
            "/api/v1/console/hotels", json={"osmId": RESERVE_ID}, headers=headers
        )
        assert started.status_code == 202, started.text
        body = started.json()
        assert body["hotelId"] == str(hotel_id(RESERVE_ID))
        listed = (await client.get("/api/v1/hotels")).json()
        assert len(listed) == 3
        assert next(h for h in listed if h["id"] == body["hotelId"])["facts"] == []
        async with db.unit_of_work() as uow:
            hotel = await uow.catalog.hotel(UUID(body["hotelId"]))
            assert hotel is not None
            assert hotel.facades == [f.value for f in building_facades(to_shape(hotel.footprint))]
            jobs = list(await uow.session.scalars(select(Job)))
            assert len(jobs) == 1
            job = jobs[0]
            assert job.kind == JobKind.HOTEL_ONBOARD
            assert job.run_id == UUID(body["runId"])
        worker = _worker(db, data, FakeClock())
        claimed = await worker.claim(1)
        await worker.execute(claimed[0])
        trace = (await client.get(f"/api/v1/runs/{body['runId']}")).json()
        assert trace["status"] == "done", trace
        questions = next(s["output"] for s in trace["steps"] if s["tool"] == "hotelier.ask")
        assert len(questions) == 3
        assert all(q["text"] and q["why"] for q in questions)
        assert {q["characteristic"] for q in questions} <= {
            "pets_policy",
            "soundproofing",
            "blackout",
            "ac",
            "elevator",
            "step_free",
            "facade_rooms",
        }
        refreshed = (await client.get("/api/v1/hotels")).json()
        assert next(h for h in refreshed if h["id"] == body["hotelId"])["facts"]
        async with db.unit_of_work() as uow:
            assert await uow.knowledge.facts([hotel_id(RESERVE_ID)])
            assert await uow.session.scalar(select(func.count()).select_from(HotelierQuestion))
            assert (await uow.session.get(Job, claimed[0].id)).status == "done"
        result = (await client.post("/api/v1/searches", json={"text": "Тихо ночью"})).json()
        assert body["hotelId"] in [m["hotelId"] for m in result["matches"]]
        assert (await client.get("/api/v1/console/hotels/reserve", headers=headers)).json() == []
        reset = await client.post("/api/v1/console/demo/reset", headers=headers)
        assert reset.status_code == 200, reset.text
        async with db.unit_of_work() as uow:
            assert await uow.catalog.hotel(hotel_id(RESERVE_ID)) is None
            assert len(await uow.catalog.hotels()) == 2
        assert (
            len((await client.get("/api/v1/console/hotels/reserve", headers=headers)).json()) == 1
        )
        assert len((await client.get("/api/v1/hotels")).json()) == 2


async def test_onboarding_rejects_unknown_duplicate_and_guest(
    app_factory: AppFactory, tmp_path: Path
) -> None:
    async with app_factory(data_dir=_data(tmp_path)) as (app, client):
        db = app.state.db
        await _seed(db, tmp_path)
        headers = await _headers(client)
        guest = await _headers(client, "guest_anna")
        assert (await client.get("/api/v1/console/hotels/reserve")).status_code == 401
        assert (
            await client.get("/api/v1/console/hotels/reserve", headers=guest)
        ).status_code == 403
        for osm_id, expected in (("invalid", 422), ("way/999", 404)):
            response = await client.post(
                "/api/v1/console/hotels", json={"osmId": osm_id}, headers=headers
            )
            assert response.status_code == expected
        response = await client.post(
            "/api/v1/console/hotels", json={"osmId": RESERVE_ID}, headers=guest
        )
        assert response.status_code == 403
        responses = await asyncio.gather(
            *(
                client.post("/api/v1/console/hotels", json={"osmId": RESERVE_ID}, headers=headers)
                for _ in range(2)
            )
        )
        assert sorted(r.status_code for r in responses) == [202, 409]
        async with db.unit_of_work() as uow:
            assert await uow.session.scalar(select(func.count()).select_from(AgentRunRow)) == 1
            assert await uow.session.scalar(select(func.count()).select_from(Job)) == 1
            assert await uow.session.scalar(select(func.count()).select_from(Hotel)) == 3


def _worker(db: Database, data: Path, clock: FakeClock) -> JobRunner:
    agents = build_agents(db, RecordingEventBus(), clock, data)
    collect = CollectService(db, agents.researcher, agents.runner, clock)
    return JobRunner(
        db,
        build_handlers(collect, agents=agents),
        clock,
        worker_id="onboard-test",
        lease=timedelta(seconds=60),
        max_attempts=3,
    )


async def test_failed_liaison_keeps_job_retryable(
    app_factory: AppFactory, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    data = _data(tmp_path)
    async with app_factory(data_dir=data) as (app, client):
        db = app.state.db
        await _seed(db, data)
        response = await client.post(
            "/api/v1/console/hotels", json={"osmId": RESERVE_ID}, headers=await _headers(client)
        )
        run_id = UUID(response.json()["runId"])
        clock = FakeClock()
        worker = _worker(db, data, clock)
        job = (await worker.claim(1))[0]

        async def unavailable(*_args: object) -> None:
            raise RuntimeError("Temporary liaison outage")

        with monkeypatch.context() as patch:
            patch.setattr(Liaison, "ask", unavailable)
            await worker.execute(job)
        async with db.unit_of_work() as uow:
            assert (await uow.session.get(Job, job.id)).status == "pending"
            assert (await uow.agents.run_row(run_id)).status == "failed"
        clock.advance(timedelta(seconds=5))
        retried = (await worker.claim(1))[0]
        await worker.execute(retried)
        async with db.unit_of_work() as uow:
            assert (await uow.session.get(Job, job.id)).status == "done"
            assert (await uow.agents.run_row(run_id)).status == "done"
            assert await uow.session.scalar(select(func.count()).select_from(Hotel)) == 3
