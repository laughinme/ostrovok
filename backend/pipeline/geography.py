"""Metric geometry, named sampling districts and OSM geometry assembly."""

import re
from typing import Any

from pyproj import Transformer
from shapely import LineString, MultiPolygon, Point, Polygon, make_valid, transform
from shapely.ops import polygonize, unary_union

# Sampling areas, not administrative boundaries. Bounds are west/south/east/north.
DISTRICTS = {
    "center": ((39.64, 43.53, 39.80, 43.75), 70),
    "khosta": ((39.80, 43.49, 39.90, 43.62), 25),
    "adler": ((39.89, 43.425, 39.98, 43.52), 45),
    "sirius": ((39.93, 43.38, 40.04, 43.425), 30),
    "krasnaya_polyana": ((39.99, 43.62, 40.37, 43.73), 30),
}
REGION_BOUNDS = (39.15, 43.0, 40.87, 44.12)
FORWARD = Transformer.from_crs(4326, 32637, always_xy=True)
INVERSE = Transformer.from_crs(32637, 4326, always_xy=True)


def metric(geometry: Any) -> Any:
    return transform(geometry, FORWARD.transform, interleaved=False)


def wgs84(geometry: Any) -> Any:
    return transform(geometry, INVERSE.transform, interleaved=False)


def identifier(element: dict[str, Any]) -> str:
    return f"{element['type']}/{element['id']}"


def line(coords: list[dict[str, float]]) -> LineString:
    return LineString([(p["lon"], p["lat"]) for p in coords])


def polygons(geometry: Any) -> MultiPolygon:
    if geometry.geom_type == "Polygon":
        return MultiPolygon([geometry])
    return MultiPolygon([p for g in getattr(geometry, "geoms", []) for p in polygons(g).geoms])


def geometry(element: dict[str, Any], *, area: bool = False) -> Any:
    if element["type"] == "node":
        return Point(element["lon"], element["lat"])
    if element["type"] == "way":
        shape = line(element["geometry"])
        return make_valid(Polygon(shape.coords)) if area and shape.is_closed else shape
    outer, inner = [], []
    for member in element.get("members", []):
        if member["type"] == "way" and member.get("geometry"):
            (inner if member.get("role") == "inner" else outer).append(line(member["geometry"]))
    shell = unary_union(list(polygonize(unary_union(outer))))
    holes = unary_union(list(polygonize(unary_union(inner))))
    return polygons(make_valid(shell.difference(holes)))


def positive_number(value: str | None) -> float | None:
    match = re.fullmatch(r"\s*(\d+(?:[.,]\d+)?)\s*(m)?\s*", value or "")
    return (
        float(match[1].replace(",", "."))
        if match and float(match[1].replace(",", ".")) > 0
        else None
    )


def height(tags: dict[str, str]) -> tuple[float, float, str]:
    levels = positive_number(tags.get("building:levels"))
    if levels is not None and levels.is_integer():
        levels = int(levels)
    explicit = positive_number(tags.get("height"))
    if explicit is not None:
        return explicit, levels or max(1, round(explicit / 3)), "osm_height"
    if levels is not None:
        return levels * 3, levels, "osm_levels"
    return 9.0, 3, "default"
