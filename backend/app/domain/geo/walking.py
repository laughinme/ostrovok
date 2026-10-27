"""Directed walking costs: signed slope matters even on a bidirectional OSM path."""

from collections.abc import Sequence
from dataclasses import dataclass
from math import exp, inf, isfinite

from app.domain.geo.types import RouteLeg, WalkProfile

STEEP_SLOPE = 0.08
PROFILE_SPEED_CAP_KMH = {WalkProfile.STROLLER: 4.0, WalkProfile.WHEELCHAIR: 3.0}
STEEP_PENALTY = {WalkProfile.STROLLER: 10.0, WalkProfile.WHEELCHAIR: 20.0}
STAIR_SPEED_CAP_KMH = 2.0


@dataclass(frozen=True, slots=True)
class WalkEdge:
    length_m: float
    rise_m: float
    steps: int = 0
    crossings: int = 0
    uncertain: bool = False
    osm_ref: str = ""


def tobler_speed_kmh(slope: float) -> float:
    """Tobler's hiking function, with signed rise / horizontal edge length."""
    if not isfinite(slope):
        raise ValueError("Slope must be finite")
    return 6 * exp(-3.5 * abs(slope + 0.05))


def edge_minutes(length_m: float, rise_m: float, profile: WalkProfile, *, steps: int = 0) -> float:
    """Directed edge time; infinity means inaccessible for this profile.

    Stroller/wheelchair speed caps and >8% penalties are model parameters, not a
    certification of accessibility. Unknown path properties remain separate evidence.
    """
    if not isfinite(length_m) or length_m <= 0 or not isfinite(rise_m) or steps < 0:
        raise ValueError("Edge needs finite positive length, finite rise and nonnegative steps")
    if steps and profile != WalkProfile.WALK:
        return inf
    slope = rise_m / length_m
    speed = tobler_speed_kmh(slope)
    if steps:
        speed = min(speed, STAIR_SPEED_CAP_KMH)
    if profile in PROFILE_SPEED_CAP_KMH:
        speed = min(speed, PROFILE_SPEED_CAP_KMH[profile])
        speed /= 1 + STEEP_PENALTY[profile] * max(0, abs(slope) - STEEP_SLOPE)
    return length_m * 0.06 / speed if speed > 0 else inf


def route_leg(edges: Sequence[WalkEdge], profile: WalkProfile) -> RouteLeg | None:
    """Aggregate one directed path; an empty path is a valid zero-length leg."""
    times = [edge_minutes(e.length_m, e.rise_m, profile, steps=e.steps) for e in edges]
    if not all(isfinite(value) for value in times):
        return None
    if any(edge.crossings < 0 for edge in edges):
        raise ValueError("Crossing count must be nonnegative")
    return RouteLeg(
        minutes=sum(times),
        length_m=sum(edge.length_m for edge in edges),
        climb_m=sum(max(0, edge.rise_m) for edge in edges),
        descent_m=sum(max(0, -edge.rise_m) for edge in edges),
        steps=sum(edge.steps for edge in edges),
        crossings=sum(edge.crossings for edge in edges),
    )


def elevation_profile(
    edges: Sequence[WalkEdge], initial_elevation_m: float
) -> tuple[tuple[float, float], ...]:
    """Cumulative (distance m, elevation m) including both ends of the directed path."""
    distance, elevation = 0.0, initial_elevation_m
    result = [(distance, elevation)]
    for edge in edges:
        distance += edge.length_m
        elevation += edge.rise_m
        result.append((distance, elevation))
    return tuple(result)
