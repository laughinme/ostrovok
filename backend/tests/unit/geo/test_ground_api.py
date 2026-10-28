from datetime import date
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from shapely import Point

from app.api.ground_deps import ground_queries
from app.api.problems import register_exception_handlers
from app.api.v1.ground import router
from app.core.errors import NotFoundError
from app.domain.catalog import MapFeature
from app.domain.geo.types import WalkProfile
from app.infra.geo.climate import ClimateCatalog
from app.service.geo.climate import hotel_climate
from app.service.geo.day import build_day
from app.service.geo.noise import hotel_noise
from app.service.geo.routes import hotel_route
from tests.unit.geo.ground_factory import ground_env, ground_hotel


@pytest.fixture
async def api():
    hotel, env = ground_hotel(), ground_env()
    env.climate = ClimateCatalog.from_file(Path("data/region/climate.json"))
    env.reader.feature.return_value = MapFeature("way/42", "poi", "Кофе", {}, Point(39.701, 43.6))
    svc = AsyncMock()
    svc.noise.return_value = await hotel_noise(hotel, env)
    svc.route.return_value = await hotel_route(hotel, env, "osm:way/42", WalkProfile.WALK)
    svc.climate.return_value = hotel_climate(hotel, env, date(2026, 11, 10), date(2026, 11, 15))
    svc.day.return_value = await build_day(hotel, env, date(2026, 11, 12))
    app = FastAPI()
    register_exception_handlers(app, debug=False)
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[ground_queries] = lambda: svc
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client, svc, f"/api/v1/hotels/{hotel.id}"


async def test_noise_climate_and_osm_path_contract(api) -> None:
    client, svc, root = api
    noise = await client.get(f"{root}/noise")
    assert noise.status_code == 200
    assert noise.json()["facades"][0]["night"]["indexDb"] is None
    route = await client.get(f"{root}/routes/osm:way/42?profile=walk")
    assert route.status_code == 200
    data = route.json()
    assert data["targetRef"] == "way/42"
    assert data["geometry"]["type"] == "LineString"
    assert data["estimated"] is True
    assert data["there"]["steps"] is None
    assert data["elevationProfile"][0][1] is None
    assert svc.route.await_args.args[1:] == ("osm:way/42", WalkProfile.WALK)
    climate = await client.get(f"{root}/climate?from=2026-11-10&to=2026-11-15")
    assert climate.status_code == 200
    assert climate.json()["days"] == 5
    assert climate.json()["values"]["airMaxC"] is not None
    assert svc.climate.await_args.args[1:] == (date(2026, 11, 10), date(2026, 11, 15))


@pytest.mark.parametrize(
    "suffix",
    [
        "/routes/unknown",
        "/routes/osm:way/nope",
        "/routes/beach?profile=car",
        "/climate?from=not-a-date&to=2026-11-15",
        "/climate?from=2026-11-10",
    ],
)
async def test_invalid_query_is_rejected(api, suffix) -> None:
    client, _, root = api
    response = await client.get(root + suffix)
    assert response.status_code == 422


async def test_missing_route_is_a_problem_response(api) -> None:
    client, svc, root = api
    svc.route.side_effect = NotFoundError("Нет доступного маршрута")
    response = await client.get(f"{root}/routes/beach?profile=wheelchair")
    assert response.status_code == 404
    assert response.json()["detail"] == "Нет доступного маршрута"


async def test_day_contract_and_required_date(api) -> None:
    client, svc, root = api
    response = await client.get(f"{root}/day?date=2026-11-12")
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == "2026-11-12"
    assert len(data["slots"]) == 6
    assert data["sunset"]["fromWindow"] is False
    assert data["slots"][0]["unavailableReason"]
    assert svc.day.await_args.args[1] == date(2026, 11, 12)
    assert (await client.get(f"{root}/day")).status_code == 422
