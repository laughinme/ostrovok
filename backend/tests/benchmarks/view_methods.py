"""Read-only real-data check: uv run python -m tests.benchmarks.view_methods (no LLM)."""

import asyncio
import json
from datetime import date
from time import perf_counter
from typing import Any

import numpy as np
from httpx import ASGITransport, AsyncClient

from app.bootstrap import build_view_environment
from app.core.config import get_settings
from app.db.database import Database
from app.db.repositories.catalog import hotel_geo
from app.domain.catalog import HotelGeo, hotel_id
from app.domain.knowledge.characteristic import Characteristic
from app.domain.knowledge.scope import Facade
from app.main import create_app
from app.service.agents.runtime import Tracer
from app.service.knowledge.registry import Registry, validate_recipe
from app.service.ports import SystemClock
from app.service.recipes.executor import Environment, Finding, MethodCall
from app.service.recipes.methods.sun_event import SunEventExecutor
from app.service.recipes.methods.view import ViewExecutor

HOTELS = ("node/12032893438", "way/53549358", "way/227214566")
KEYS = ("sea_view", "mountain_view", "sunset_over_sea", "sunrise")
DAY = date(2026, 11, 12)


class BenchmarkTracer(Tracer):
    def __init__(self) -> None:
        self.tools: list[tuple[str, int]] = []

    async def tool(
        self,
        name: str,
        *,
        summary: str,
        args: Any = None,
        output: Any = None,
        duration_ms: int = 0,
    ) -> None:
        self.tools.append((name, duration_ms))


async def methods(
    hotel: HotelGeo,
    env: Environment,
    registry: dict[str, Characteristic],
) -> tuple[dict[str, Any], list[Finding]]:
    results: dict[str, Any] = {}
    sea = []
    for key in KEYS:
        characteristic = registry[key]
        trace = BenchmarkTracer()
        call = MethodCall(hotel, characteristic, validate_recipe(characteristic.recipe), trace)
        executor = ViewExecutor() if key.endswith("view") else SunEventExecutor()
        start = perf_counter()
        findings = await executor.collect(call, env)
        if key == "sea_view":
            sea = findings
        best = max(findings, key=lambda f: f.confidence if f.value else 1 - f.confidence)
        results[key] = {
            "seconds": round(perf_counter() - start, 3),
            "findings": len(findings),
            "positive": sum(f.value is True for f in findings),
            "best_scope": best.scope.key,
            "best_p_yes": best.confidence if best.value else 1 - best.confidence,
            "tools": trace.tools,
        }
    return results, sea


async def window_measurements(
    hotel: HotelGeo,
    facade: Facade,
    db: Database,
) -> dict[str, Any]:
    settings = get_settings().model_copy(update={"log_level": "WARNING"})
    app = create_app(settings)
    app.state.db = db
    floor = min(5, hotel.floors)
    url = f"/api/v1/hotels/{hotel.id}/window?facade={facade.value}&floor={floor}&date={DAY}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        start = perf_counter()
        response = await client.get(url)
        response.raise_for_status()
        cold_ms = (perf_counter() - start) * 1000
        timings = []
        for _ in range(20):
            start = perf_counter()
            (await client.get(url)).raise_for_status()
            timings.append((perf_counter() - start) * 1000)
    floors = {}
    start = perf_counter()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for f in sorted({min(2, hotel.floors), floor, min(9, hotel.floors)}):
            result = await client.get(url.replace(f"floor={floor}", f"floor={f}"))
            result.raise_for_status()
            floors[f] = round(result.json()["seaFraction"], 4)
    data = response.json()
    return {
        "facade": facade.value,
        "cold_http_ms": round(cold_ms, 1),
        "warm_http_p95_ms": round(float(np.percentile(timings, 95)), 1),
        "three_floors_ms": round((perf_counter() - start) * 1000, 1),
        "sea_by_floor": floors,
        "minimum_sea_floor": data["minimumSeaFloor"],
        "peaks": [p["name"] for p in data["peaks"][:8]],
        "sunrise": data["sunrise"]["at"],
        "sunset": data["sunset"]["at"],
        "disappearance": data["disappearance"],
    }


async def main() -> list[dict[str, Any]]:
    settings = get_settings()
    db = Database(settings)
    output = []
    try:
        async with db.unit_of_work() as uow:
            registry = {c.key: c for c in await Registry(uow).all()}
            hotels = [hotel_geo(h) for h in await uow.catalog.hotels([hotel_id(o) for o in HOTELS])]
        for hotel in hotels:
            env = build_view_environment(db, SystemClock(), settings.data_dir)
            results, sea = await methods(hotel, env, registry)
            best = max(sea, key=lambda f: f.evidence[0].params["share"])
            facade = next(iter(best.scope.facades or ()))
            window = await window_measurements(hotel, facade, db)
            output.append(
                {
                    "hotel": hotel.name,
                    "osm_id": hotel.osm_id,
                    "floors": hotel.floors,
                    "facades": hotel.facades,
                    "methods": results,
                    "window": window,
                }
            )
    finally:
        await db.dispose()
    return output


if __name__ == "__main__":
    print(json.dumps(asyncio.run(main()), indent=2, ensure_ascii=False))  # noqa: T201
