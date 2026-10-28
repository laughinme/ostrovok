"""Real OSM onboarding on a small isolated scene; never loads the full knowledge seed.

TEST_DATABASE_URL=.../okno_onboard_test TEST_REDIS_URL=redis://localhost:6380/14 \
  caffeinate -i uv run python -m tests.benchmarks.onboarding [reserve OSM id]
"""

import asyncio
import csv
import gzip
import json
import shutil
import sys
import tempfile
from datetime import timedelta
from pathlib import Path
from time import perf_counter
from uuid import UUID

from shapely import box, from_wkb
from sqlalchemy import select

from app.bootstrap import build_agents
from app.db.models import Job
from app.domain.jobs import JobKind
from app.service.agents.collect import CollectService
from app.service.catalog.seed import read_csv_gz
from app.service.jobs import JobRunner
from app.service.ports import RecordingEventBus, SystemClock
from app.worker import build_handlers
from tests.conftest import build_settings
from tests.integration.conftest import running_app
from tests.integration.test_onboarding_api import _headers, _seed
from tests.seed_data import write_region

DATA = Path(__file__).resolve().parents[2] / "data"


def scene(data: Path, osm_id: str) -> None:
    write_region(data)
    row = next(
        r for r in read_csv_gz(DATA / "region/reserve_hotels.csv.gz") if r["osm_id"] == osm_id
    )
    lon, lat = float(row["lon"]), float(row["lat"])
    bounds = box(lon - 0.05, lat - 0.04, lon + 0.05, lat + 0.04)
    for filename in ("buildings.csv.gz", "osm_features.csv.gz"):
        rows = list(read_csv_gz(DATA / "region" / filename))
        with gzip.open(data / "region" / filename, "wt") as target:
            writer = csv.DictWriter(target, fieldnames=list(rows[0]))
            writer.writeheader()
            geometry_key = "wkb"
            for record in rows:
                if record.get("kind") == "peak" or from_wkb(
                    bytes.fromhex(record[geometry_key])
                ).intersects(bounds):
                    writer.writerow(record)
    for filename in (
        "reserve_hotels.csv.gz",
        "dem.json",
        "dem_int16.npy",
        "sea.wkb.gz",
        "walk_graph.npz",
        "climate.json",
    ):
        (data / "region" / filename).symlink_to(DATA / "region" / filename)
    shutil.copytree(DATA / "registry", data / "registry")


async def measure(data: Path, osm_id: str) -> dict[str, object]:
    settings = build_settings(data_dir=data)
    if not settings.database_url.endswith("/okno_onboard_test"):
        raise ValueError("This benchmark may only reset okno_onboard_test")
    async with running_app(settings) as (app, client):
        db = app.state.db
        await _seed(db, data)
        headers = await _headers(client)
        clock, events = SystemClock(), RecordingEventBus()
        agents = build_agents(db, events, clock, data)
        collect = CollectService(db, agents.researcher, agents.runner, clock)
        worker = JobRunner(
            db,
            build_handlers(collect, agents=agents),
            clock,
            worker_id="onboard-benchmark",
            lease=timedelta(seconds=60),
            max_attempts=1,
        )
        started = perf_counter()
        response = await client.post(
            "/api/v1/console/hotels", json={"osmId": osm_id}, headers=headers
        )
        response.raise_for_status()
        body = response.json()
        job = next(j for j in await worker.claim(10) if j.kind == JobKind.HOTEL_ONBOARD)
        await worker.execute(job)
        elapsed = perf_counter() - started
        trace = (await client.get(f"/api/v1/runs/{body['runId']}")).json()
        result = (await client.post("/api/v1/searches", json={"text": "Вид на море"})).json()
        async with db.unit_of_work() as uow:
            facts = await uow.knowledge.facts([UUID(body["hotelId"])])
            stored_job = await uow.session.scalar(select(Job).where(Job.id == job.id))
            return {
                "osmId": osm_id,
                "seconds": round(elapsed, 3),
                "runStatus": trace["status"],
                "jobStatus": stored_job.status,
                "facts": len(facts),
                "characteristics": sorted({f.characteristic for f in facts}),
                "questions": next(
                    s["output"] for s in trace["steps"] if s["tool"] == "hotelier.ask"
                ),
                "found": body["hotelId"] in [m["hotelId"] for m in result["matches"]],
                "tools": [
                    {"tool": s["tool"], "ms": s["durationMs"]} for s in trace["steps"] if s["tool"]
                ],
            }


def main() -> None:
    osm_id = (
        sys.argv[1]
        if len(sys.argv) > 1
        else next(read_csv_gz(DATA / "region/reserve_hotels.csv.gz"))["osm_id"]
    )
    with tempfile.TemporaryDirectory(prefix="okno-onboard-") as directory:
        data = Path(directory)
        scene(data, osm_id)
        sys.stdout.write(
            json.dumps(asyncio.run(measure(data, osm_id)), ensure_ascii=False, indent=2) + "\n"
        )


if __name__ == "__main__":
    main()
