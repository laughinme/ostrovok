from math import inf

import pytest

from app.domain.geo.types import WalkProfile
from app.domain.geo.walking import (
    WalkEdge,
    edge_minutes,
    elevation_profile,
    route_leg,
    tobler_speed_kmh,
)


def test_hill_return_is_slower_and_tobler_peak_is_downhill() -> None:
    assert tobler_speed_kmh(-0.05) == 6
    downhill = route_leg([WalkEdge(100, -10)], WalkProfile.WALK)
    uphill = route_leg([WalkEdge(100, 10)], WalkProfile.WALK)
    assert uphill.minutes > downhill.minutes
    assert uphill.climb_m == downhill.descent_m == 10


@pytest.mark.parametrize("profile", [WalkProfile.STROLLER, WalkProfile.WHEELCHAIR])
def test_mobility_profiles_forbid_steps_and_penalize_steep_slopes(profile: WalkProfile) -> None:
    assert edge_minutes(100, 10, profile, steps=1) == inf
    assert route_leg([WalkEdge(100, 10, steps=5)], profile) is None
    flat = edge_minutes(100, 0, profile)
    steep = edge_minutes(100, 15, profile)
    assert steep > flat
    assert steep > edge_minutes(100, 15, WalkProfile.WALK)


def test_leg_metrics_and_elevation_profile() -> None:
    edges = [WalkEdge(20, 5, steps=10), WalkEdge(80, -3, crossings=1)]
    leg = route_leg(edges, WalkProfile.WALK)
    assert leg.length_m == 100
    assert leg.climb_m == 5
    assert leg.descent_m == 3
    assert leg.steps == 10
    assert leg.crossings == 1
    assert elevation_profile(edges, 50) == ((0, 50), (20, 55), (100, 52))
    assert route_leg([], WalkProfile.WALK).minutes == 0


@pytest.mark.parametrize(("length", "rise"), [(0, 0), (-1, 1), (inf, 0), (100, inf)])
def test_invalid_edges_are_rejected(length: float, rise: float) -> None:
    with pytest.raises(ValueError, match="Edge needs"):
        edge_minutes(length, rise, WalkProfile.WALK)
