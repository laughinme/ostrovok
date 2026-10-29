from collections.abc import Sequence
from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt

import numpy as np
from shapely.geometry.base import BaseGeometry

from app.domain.catalog import MapFeature
from app.domain.geo.types import LonLat, Route, WalkProfile
from app.domain.geo.walking import tobler_speed_kmh
from app.service.ports import Router, TerrainModel

WALK_M_PER_MIN = 80.0
DETOUR = 1.35
EARTH_RADIUS_M = 6_371_000.0


def haversine_m(a: LonLat, b: LonLat) -> float:
    d_lat, d_lon = radians(b.lat - a.lat), radians(b.lon - a.lon)
    h = sin(d_lat / 2) ** 2 + cos(radians(a.lat)) * cos(radians(b.lat)) * sin(d_lon / 2) ** 2
    return 2 * EARTH_RADIUS_M * asin(sqrt(h))


def anchor(geometry: BaseGeometry, toward: LonLat) -> LonLat:
    if geometry.geom_type == "Point":
        return LonLat(geometry.x, geometry.y)
    from shapely import Point  # noqa: PLC0415
    from shapely.ops import nearest_points  # noqa: PLC0415

    nearest = nearest_points(geometry, Point(toward.lon, toward.lat))[0]
    return LonLat(nearest.x, nearest.y)


@dataclass(frozen=True, slots=True)
class Walk:
    feature: MapFeature
    minutes: float
    back_minutes: float
    route: Route | None
    estimated: bool
    climb_m: float | None = None
    back_climb_m: float | None = None


def straight_minutes(origin: LonLat, target: LonLat) -> float:
    return haversine_m(origin, target) * DETOUR / WALK_M_PER_MIN


def nearest_walk(
    router: Router | None,
    origin: LonLat,
    features: Sequence[MapFeature],
    profile: WalkProfile = WalkProfile.WALK,
    *,
    terrain: TerrainModel | None = None,
) -> Walk | None:
    if not features:
        return None
    targets = [anchor(f.geometry, origin) for f in features]
    if router is not None:
        found = router.nearest_of(origin, targets, profile)
        if found is not None:
            index, route = found
            return Walk(
                features[index],
                route.there.minutes,
                route.back.minutes,
                route,
                False,
                route.there.climb_m,
                route.back.climb_m,
            )
        return None
    if profile is not WalkProfile.WALK:
        return None
    index = min(range(len(targets)), key=lambda i: haversine_m(origin, targets[i]))
    return _estimate(features[index], origin, targets[index], terrain)


def _estimate(
    feature: MapFeature, origin: LonLat, target: LonLat, terrain: TerrainModel | None
) -> Walk:
    length = haversine_m(origin, target) * DETOUR
    if terrain is None or length == 0:
        minutes = length / WALK_M_PER_MIN
        return Walk(feature, minutes, minutes, None, True)
    start, end = terrain.elevation(np.array([[origin.lon, origin.lat], [target.lon, target.lat]]))
    rise = float(end - start)
    there = length / (tobler_speed_kmh(rise / length) * 1000 / 60)
    back = length / (tobler_speed_kmh(-rise / length) * 1000 / 60)
    return Walk(feature, there, back, None, True, max(0.0, rise), max(0.0, -rise))


def within_minutes(
    router: Router | None,
    origin: LonLat,
    features: Sequence[MapFeature],
    minutes: float,
) -> list[tuple[MapFeature, float, bool]]:
    anchors = {f.osm_id: anchor(f.geometry, origin) for f in features}
    if router is not None:
        reached = router.reachable(
            origin,
            [(f.osm_id, f.name, anchors[f.osm_id]) for f in features],
            minutes,
            WalkProfile.WALK,
        )
        if reached:
            by_ref = {f.osm_id: f for f in features}
            return [(by_ref[r.ref], r.minutes, False) for r in reached]
    found = [(f, straight_minutes(origin, anchors[f.osm_id]), True) for f in features]
    return sorted([x for x in found if x[1] <= minutes], key=lambda x: x[1])
