from unittest.mock import Mock

import pytest
from shapely import Point

from app.core.errors import NotFoundError
from app.domain.geo.types import LonLat, Route, RouteLeg, WalkProfile
from app.service.geo.routes import hotel_route_to
from tests.unit.geo.ground_factory import ground_env, ground_hotel


def sample_route():
    origin, target = LonLat(39.7, 43.6), LonLat(39.701, 43.601)
    leg = RouteLeg(4.5, 240, 3, 1, 0, 1)
    return Route(
        origin,
        target,
        WalkProfile.WALK,
        leg,
        leg,
        ((39.7, 43.6), (39.701, 43.601)),
        ((0, 12), (240, 14)),
    )


async def test_coordinate_route_keeps_real_graph_geometry_and_requested_profile() -> None:
    hotel, env = ground_hotel(), ground_env()
    env.router = Mock()
    route = sample_route()
    env.router.route.return_value = route
    result = await hotel_route_to(hotel, env, route.target, "Морской вокзал", WalkProfile.STROLLER)
    env.router.route.assert_called_once_with(hotel.location, route.target, WalkProfile.STROLLER)
    assert result.coordinates == route.coordinates
    assert result.walk.estimated is False
    assert result.walk.feature.name == "Морской вокзал"
    assert result.walk.feature.geometry == Point(39.701, 43.601)


async def test_missing_graph_or_path_does_not_fabricate_a_straight_route() -> None:
    hotel, env = ground_hotel(), ground_env()
    with pytest.raises(NotFoundError):
        await hotel_route_to(hotel, env, LonLat(39.701, 43.601), "Адрес", WalkProfile.WALK)
    env.router = Mock()
    env.router.route.return_value = None
    with pytest.raises(NotFoundError):
        await hotel_route_to(hotel, env, LonLat(39.701, 43.601), "Адрес", WalkProfile.WALK)


async def test_address_outside_coverage_does_not_become_a_straight_route() -> None:
    hotel, env = ground_hotel(), ground_env()
    env.router = Mock()
    env.router.route.return_value = None
    with pytest.raises(NotFoundError):
        await hotel_route_to(hotel, env, LonLat(37.6, 55.7), "Москва", WalkProfile.WALK)
    env.router.route.assert_called_once_with(hotel.location, LonLat(37.6, 55.7), WalkProfile.WALK)
