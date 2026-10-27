"""Fetch OSM in small grid cells and clip by union of metric hotel buffers."""

import json
import math
from typing import Any

from shapely import Point, box
from shapely.ops import unary_union

from pipeline import sea
from pipeline.catalog import select_hotels
from pipeline.geography import REGION_BOUNDS, geometry, height, identifier, metric, wgs84
from pipeline.storage import REGION, overpass, read_csv, write_csv


def hotel_buffers(radius: float) -> Any:
    return unary_union(
        [
            metric(Point(float(h["lon"]), float(h["lat"]))).buffer(radius)
            for h in read_csv("hotels.csv.gz")
        ]
    )


def tiles(area: Any, step: float = 0.08) -> list[tuple[float, float, float, float]]:
    west, south, east, north = wgs84(area).bounds
    result = []
    for x in range(math.floor(west / step), math.ceil(east / step)):
        for y in range(math.floor(south / step), math.ceil(north / step)):
            bounds = tuple(
                round(v, 6) for v in (x * step, y * step, (x + 1) * step, (y + 1) * step)
            )
            if metric(box(*bounds)).intersects(area):
                result.append(bounds)
    return result


def kind(tags: dict[str, str]) -> str | None:
    rules = [
        (tags.get("natural") == "peak", "peak"),
        (tags.get("aeroway") == "runway", "runway"),
        (tags.get("natural") == "beach" or tags.get("leisure") == "beach_resort", "beach"),
        (
            tags.get("landuse") == "construction" or tags.get("building") == "construction",
            "construction",
        ),
        (tags.get("amenity") in ("bar", "pub", "nightclub"), "bar_club"),
        (
            tags.get("railway") in ("station", "halt", "tram_stop")
            or tags.get("public_transport") == "station",
            "station",
        ),
        (bool(tags.get("railway")), "railway"),
        (bool(tags.get("highway")), "road"),
        (tags.get("leisure") == "park", "park"),
        (any(k in tags for k in ("amenity", "shop", "tourism", "leisure", "healthcare")), "poi"),
    ]
    return next((name for matches, name in rules if matches), None)


def export(elements: list[dict[str, Any]]) -> None:
    zones = {radius: hotel_buffers(radius) for radius in (1500, 2000, 2500)}
    member_ids = {
        m["ref"]
        for e in elements
        if e["type"] == "relation" and e.get("tags", {}).get("building")
        for m in e.get("members", [])
        if m["type"] == "way"
    }
    buildings, features = [], []
    for element in sorted(elements, key=identifier):
        tags = element.get("tags", {})
        is_building = tags.get("building") not in (None, "no")
        is_area = (
            is_building
            or any(key in tags for key in ("landuse", "leisure", "amenity", "shop"))
            or tags.get("natural") == "beach"
        )
        shape = geometry(element, area=is_area)
        if shape.is_empty:
            continue
        projected = metric(shape)
        if (
            is_building
            and shape.geom_type in ("Polygon", "MultiPolygon")
            and projected.intersects(zones[2000])
        ) and not (element["type"] == "way" and element["id"] in member_ids):
            h, levels, source = height(tags)
            buildings.append(
                {
                    "osm_id": identifier(element),
                    "wkb": shape.wkb_hex,
                    "height_m": h,
                    "levels": levels,
                    "height_source": source,
                    "building": tags["building"],
                }
            )
        feature_kind = kind(tags)
        if feature_kind is None:
            continue
        radius = 1500 if feature_kind in ("road", "railway") else 2500
        if feature_kind not in ("beach", "runway", "peak") and not projected.intersects(
            zones[radius]
        ):
            continue
        features.append(
            {
                "osm_id": identifier(element),
                "kind": feature_kind,
                "name": tags.get("name", ""),
                "tags": json.dumps(tags, ensure_ascii=False, sort_keys=True),
                "wkb": shape.wkb_hex,
            }
        )
    write_csv(
        "buildings.csv.gz",
        ["osm_id", "wkb", "height_m", "levels", "height_source", "building"],
        buildings,
    )
    write_csv("osm_features.csv.gz", ["osm_id", "kind", "name", "tags", "wkb"], features)
    print(f"OSM: {len(buildings):,} buildings, {len(features):,} features", flush=True)


def run() -> None:
    if not (REGION / "hotels.csv.gz").exists():
        select_hotels()
    elements = {}
    cells = tiles(hotel_buffers(2500))
    for index, (west, south, east, north) in enumerate(cells, 1):
        bbox = f"({south},{west},{north},{east})"
        selectors = [
            'nwr["building"]',
            'nwr["highway"]',
            'nwr["railway"]',
            *[f'nwr["{key}"]' for key in ("amenity", "shop", "tourism", "leisure", "healthcare")],
            'nwr["landuse"="construction"]',
        ]
        data = overpass("(" + "".join(s + bbox + ";" for s in selectors) + ")", seconds=30)
        elements.update((identifier(e), e) for e in data["elements"])
        print(f"OSM cell {index}/{len(cells)}: {len(elements):,} unique objects", flush=True)
    west, south, east, north = REGION_BOUNDS
    bbox = f"({south},{west},{north},{east})"
    data = overpass(f'(nwr["natural"~"^(peak|beach)$"]{bbox};nwr["aeroway"="runway"]{bbox};)')
    elements.update((identifier(e), e) for e in data["elements"])
    export(list(elements.values()))
    sea.run()
