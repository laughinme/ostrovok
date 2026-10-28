"""Crossing counts over OSM railways/major roads; unknown at-grade crossings stay uncertain."""

from dataclasses import replace
from typing import Any

import numpy as np
from shapely import Point, STRtree, linestrings

from pipeline.walk_topology import Coordinate, WalkNetwork, WalkSegment
from pipeline.walkways import ALLOW_FOOT, DENY_ACCESS, MAJOR_ROADS, grade


def blocked_nodes(points: list[dict[str, Any]]) -> set[Coordinate]:
    return {
        tuple(p["geometry"].coords[0])
        for p in points
        if p["tags"].get("foot") in DENY_ACCESS
        or (p["tags"].get("access") in DENY_ACCESS and p["tags"].get("foot") not in ALLOW_FOOT)
    }


def annotate_crossings(
    network: WalkNetwork,
    ways: list[dict[str, Any]],
    points: list[dict[str, Any]],
) -> WalkNetwork:
    obstacles = [
        w
        for w in ways
        if w["geometry"].geom_type == "LineString"
        and (
            w["tags"].get("highway") in MAJOR_ROADS
            or w["tags"].get("railway") in {"rail", "light_rail", "narrow_gauge", "tram"}
        )
    ]
    shapes = [w["geometry"] for w in obstacles]
    tree = STRtree(shapes)
    explicit = {
        tuple(p["geometry"].coords[0]): p["tags"]
        for p in points
        if p["tags"].get("highway") == "crossing"
        or p["tags"].get("railway") in {"crossing", "level_crossing"}
    }
    # Intersect in the source CRS: separately projected chords can miss a shared OSM vertex.
    geometry = linestrings(np.array([[s.start, s.end] for s in network.segments]))
    segments = tuple(
        _annotate(s, line, obstacles, shapes, tree, explicit=explicit)
        for s, line in zip(network.segments, geometry, strict=True)
    )
    return replace(network, segments=segments)


def _annotate(
    segment: WalkSegment,
    line: Any,
    obstacles: list[dict[str, Any]],
    shapes: list[Any],
    tree: Any,
    *,
    explicit: dict[Coordinate, dict[str, str]],
) -> WalkSegment:
    start, end = Point(line.coords[0]), Point(line.coords[-1])
    interior, starts, ends, unknown = 0, 0, 0, False
    for point, separated in _hits(segment, line, obstacles, shapes, tree):
        at_start, at_end = point.distance(start) < 1e-10, point.distance(end) < 1e-10
        starts += at_start
        ends += at_end
        interior += not (at_start or at_end)
        tagged = (at_start and segment.start in explicit) or (at_end and segment.end in explicit)
        unknown |= not separated and not tagged
    return replace(
        segment,
        crossings=interior,
        start_crossings=starts,
        end_crossings=ends,
        uncertain=segment.uncertain or unknown,
    )


def _hits(
    segment: WalkSegment,
    line: Any,
    obstacles: list[dict[str, Any]],
    shapes: list[Any],
    tree: Any,
) -> list[tuple[Point, bool]]:
    hits: dict[tuple[float, float], tuple[Point, bool]] = {}
    for index in tree.query(line, predicate="intersects"):
        obstacle = obstacles[index]
        if obstacle["osm_id"] == segment.ref:
            continue
        intersection = line.intersection(shapes[index])
        points = (
            [intersection]
            if intersection.geom_type == "Point"
            else getattr(intersection, "geoms", [])
        )
        for point in points:
            if point.geom_type != "Point" or not _transverse(line, shapes[index], point):
                continue
            separated = segment.layer != grade(obstacle["tags"])
            key = (round(point.x, 10), round(point.y, 10))
            previous = hits.get(key)
            hits[key] = (point, separated and (previous is None or previous[1]))
    return list(hits.values())


def _transverse(line: Any, obstacle: Any, point: Point) -> bool:
    distance = obstacle.project(point)
    a = obstacle.interpolate(max(0, distance - 1e-5))
    b = obstacle.interpolate(min(obstacle.length, distance + 1e-5))
    dx, dy = np.subtract(line.coords[-1], line.coords[0])
    ox, oy = b.x - a.x, b.y - a.y
    return abs(dx * oy - dy * ox) > 0.05 * np.hypot(dx, dy) * np.hypot(ox, oy)
