import pytest

from app.domain.geo.types import LonLat, WalkProfile
from app.infra.geo.router import ScipyRouter
from app.service.ports import Router
from tests.unit.geo.graph_factory import make_graph


def hill_router() -> ScipyRouter:
    return ScipyRouter(
        make_graph(
            [(39.7, 43.6, 40), (39.7, 43.601, 20), (39.7, 43.602, 0)],
            [(0, 1), (1, 0), (1, 2), (2, 1)],
            [100, 100, 100, 100],
            crossings=[0, 0, 1, 1],
            uncertain=[False, False, True, True],
        )
    )


def test_router_port_hill_and_evidence() -> None:
    router: Router = hill_router()
    result = router.route(LonLat(39.7, 43.6), LonLat(39.7, 43.602), WalkProfile.WALK)
    assert result is not None
    assert result.back.minutes > result.there.minutes
    assert result.there.length_m == 200
    assert result.there.descent_m == result.back.climb_m == 40
    assert result.there.crossings == 1
    assert result.elevation_profile == ((0, 40), (100, 20), (200, 0))
    assert result.coordinates == ((39.7, 43.6), (39.7, 43.601), (39.7, 43.602))
    assert result.uncertain_share == 0.5
    assert set(result.osm_refs) == {"way/0", "way/1", "way/2", "way/3"}


def test_profiles_take_ramp_instead_of_steps() -> None:
    router = ScipyRouter(
        make_graph(
            [(39.7, 43.6, 0), (39.7, 43.601, 0), (39.701, 43.6, 0)],
            [(0, 1), (1, 0), (0, 2), (2, 1), (1, 2), (2, 0)],
            [20, 20, 100, 100, 100, 100],
            steps=[10, 10, 0, 0, 0, 0],
        )
    )
    origin, target = LonLat(39.7, 43.6), LonLat(39.7, 43.601)
    assert router.route(origin, target, WalkProfile.WALK).there.steps == 10
    for profile in (WalkProfile.STROLLER, WalkProfile.WHEELCHAIR):
        route = router.route(origin, target, profile)
        assert route.there.steps == 0
        assert route.there.length_m == 200


def test_nearest_uses_walk_cost_and_reachable_uses_minutes() -> None:
    router = ScipyRouter(
        make_graph(
            [(39.7, 43.6, 0), (39.7, 43.601, 0), (39.7, 43.602, 0)],
            [(0, 1), (1, 0), (0, 2), (2, 0)],
            [1000, 1000, 200, 200],
        )
    )
    origin = LonLat(39.7, 43.6)
    targets = [LonLat(39.7, 43.601), LonLat(39.7, 43.602)]
    index, route = router.nearest_of(origin, targets, WalkProfile.WALK)
    assert index == 1
    assert route.target == targets[1]
    places = [("long", "Long", targets[0]), ("short", "Short", targets[1])]
    reachable = router.reachable(origin, places, 3, WalkProfile.WALK)
    assert [place.ref for place in reachable] == ["short"]
    assert reachable[0].minutes == pytest.approx(route.there.minutes)


def test_unreachable_return_and_excessive_snap_are_rejected() -> None:
    router = ScipyRouter(
        make_graph(
            [(39.7, 43.6, 0), (39.7, 43.601, 0)],
            [(0, 1)],
            [100],
        )
    )
    origin, target = LonLat(39.7, 43.6), LonLat(39.7, 43.601)
    assert router.route(origin, target, WalkProfile.WALK) is None
    assert router.nearest_of(origin, [target], WalkProfile.WALK) is None
    assert router.route(origin, LonLat(40, 44), WalkProfile.WALK) is None
    assert router.nearest_of(origin, [], WalkProfile.WALK) is None


def test_connectors_count_as_uncertain_and_zero_trip_has_zero_length() -> None:
    router = hill_router()
    origin, target = LonLat(39.70005, 43.6), LonLat(39.7, 43.602)
    result = router.route(origin, target, WalkProfile.WALK)
    assert result.there.length_m > 200
    assert result.uncertain_share > 0.5
    assert result.coordinates[0] == (origin.lon, origin.lat)
    same = router.route(origin, origin, WalkProfile.WALK)
    assert same.there.minutes == same.back.minutes == 0
    assert same.coordinates == ((origin.lon, origin.lat),)


def test_zero_budget_and_invalid_budget() -> None:
    router = hill_router()
    origin = LonLat(39.70005, 43.6)
    result = router.reachable(origin, [("self", None, origin)], 0, WalkProfile.WALK)
    assert result[0].minutes == 0
    with pytest.raises(ValueError, match="budget"):
        router.reachable(origin, [], -1, WalkProfile.WALK)
