from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from shapely import Point

from app.api.ground_deps import geocoder, ground_queries
from app.api.problems import register_exception_handlers
from app.api.v1.ground import router
from app.domain.catalog import MapFeature
from app.domain.geo.types import LonLat, WalkProfile
from app.service.geo.places import Place
from app.service.geo.routes import RouteView
from app.service.recipes.methods.reach import Walk
from tests.unit.geo.ground_factory import ground_hotel
from tests.unit.geo.test_directions import sample_route


@pytest.fixture
async def api():
    hotel = ground_hotel()
    svc, search = AsyncMock(), AsyncMock()
    svc.hotel.return_value = hotel
    search.search.return_value = [Place("osm:way/42", "Кофе", "Сочи, улица 1", (39.701, 43.601))]
    route = sample_route()
    walk = Walk(
        MapFeature("point:39.701,43.601", "destination", "Кофе", {}, Point(39.701, 43.601)),
        4.5,
        4.5,
        route,
        False,
    )
    svc.route_to.return_value = RouteView(walk, route.coordinates, route.elevation_profile)
    app = FastAPI()
    register_exception_handlers(app, debug=False)
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[ground_queries] = lambda: svc
    app.dependency_overrides[geocoder] = lambda: search
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client, svc, search, f"/api/v1/hotels/{hotel.id}"


async def test_explicit_address_search_and_coordinate_route(api) -> None:
    client, svc, search, root = api
    response = await client.get(root + "/places", params={"q": "улица 1"})
    assert response.status_code == 200
    assert response.json()[0]["location"] == [39.701, 43.601]
    search.search.assert_awaited_once_with("улица 1", ground_hotel().location)
    response = await client.get(
        root + "/route",
        params={"lon": 39.701, "lat": 43.601, "name": "Кофе", "profile": "stroller"},
    )
    assert response.status_code == 200
    assert response.json()["estimated"] is False
    assert response.json()["targetName"] == "Кофе"
    svc.route_to.assert_awaited_once_with(
        ground_hotel().id, LonLat(39.701, 43.601), "Кофе", WalkProfile.STROLLER
    )


@pytest.mark.parametrize(
    "params",
    [
        {"lon": "nan", "lat": 43},
        {"lon": 181, "lat": 43},
        {"lon": 39, "lat": 91},
        {"lon": 39},
        {"lon": 39, "lat": 43, "profile": "car"},
    ],
)
async def test_invalid_route_does_not_reach_graph(api, params) -> None:
    client, svc, _, root = api
    assert (await client.get(root + "/route", params=params)).status_code == 422
    svc.route_to.assert_not_awaited()


async def test_blank_address_does_not_call_upstream(api) -> None:
    client, _, search, root = api
    response = await client.get(root + "/places", params={"q": "   "})
    assert response.status_code == 400
    search.search.assert_not_awaited()
