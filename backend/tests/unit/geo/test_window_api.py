from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.window_deps import window_queries
from app.main import create_app
from app.service.geo.window import WindowQueries
from tests.unit.geo.view_factory import view_environment


@pytest.fixture
def window_world(monkeypatch, settings):
    hotel, env = view_environment()
    catalog = SimpleNamespace(hotel=AsyncMock(return_value=hotel))

    @asynccontextmanager
    async def uow():
        yield SimpleNamespace(catalog=catalog)

    monkeypatch.setattr("app.service.geo.window.hotel_geo", lambda row: row)
    queries = WindowQueries(SimpleNamespace(unit_of_work=uow), env)
    app = create_app(settings)
    app.dependency_overrides[window_queries] = lambda: queries
    return hotel, env, catalog, app


async def test_window_json_geometry_sun_and_cached_repeat(window_world) -> None:
    hotel, _, _, app = window_world
    url = f"/api/v1/hotels/{hotel.id}/window?facade=S&floor=5&date=2026-11-12"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(url)
        assert response.status_code == 200
        data = response.json()
        assert data["date"] == "2026-11-12"
        assert data["facade"] == "S"
        assert data["seaFraction"] > 0.9
        assert data["minimumSeaFloor"] == 1
        assert len(data["horizon"]) == 141
        assert data["horizon"][0]["kind"] in {"sea", "terrain", "building"}
        assert all(p["at"].endswith("+03:00") for p in data["sunPath"])
        assert "azimuthDeg" in data["sunset"]
        assert data["attribution"].startswith("© OpenStreetMap")
        assert (await client.get(url)).json() == data
        assert "NaN" not in response.text
        assert "Infinity" not in response.text


async def test_window_rejects_unknown_facade_floor_and_missing_data(window_world) -> None:
    hotel, env, catalog, app = window_world
    base = f"/api/v1/hotels/{hotel.id}/window"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for query in ("facade=NW&floor=5", "facade=S&floor=7", "facade=S&floor=0"):
            assert (await client.get(f"{base}?{query}&date=2026-11-12")).status_code == 422
        env.terrain = None
        query = f"{base}?facade=S&floor=5&date=2026-11-12"
        assert (await client.get(query)).status_code == 503
        catalog.hotel.return_value = None
        assert (await client.get(query)).status_code == 404
