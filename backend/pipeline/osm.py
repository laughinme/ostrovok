"""Export contracted WGS84 CSV files from the regional Geofabrik cache."""

import json
from typing import Any

from shapely import Point, box, make_valid
from shapely.ops import unary_union

from pipeline import pbf, sea
from pipeline.geography import REGION_BOUNDS, height, metric
from pipeline.storage import REGION, read_csv, write_csv


def hotel_buffers(radius: float) -> Any:
    return unary_union(
        [
            metric(Point(float(h["lon"]), float(h["lat"]))).buffer(radius)
            for h in read_csv("hotels.csv.gz")
        ]
    )


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


def export(records: list[dict[str, Any]]) -> None:
    zones = {radius: hotel_buffers(radius) for radius in (1500, 2000, 2500)}
    region = box(*REGION_BOUNDS)
    buildings, features = [], []
    for record in sorted(records, key=lambda row: row["osm_id"]):
        tags = record["tags"]
        shape = make_valid(record["geometry"])
        projected = metric(shape)
        if (
            tags.get("building") not in (None, "no")
            and shape.geom_type in ("Polygon", "MultiPolygon")
            and projected.intersects(zones[2000])
        ):
            h, levels, source = height(tags)
            buildings.append(
                {
                    "osm_id": record["osm_id"],
                    "wkb": shape.wkb_hex,
                    "height_m": h,
                    "levels": levels,
                    "height_source": source,
                    "building": tags["building"],
                }
            )
        feature_kind = kind(tags)
        if feature_kind is None or not include(
            feature_kind, tags, shape, projected, zones, region=region
        ):
            continue
        features.append(
            {
                "osm_id": record["osm_id"],
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


def include(
    feature_kind: str,
    tags: dict[str, str],
    shape: Any,
    projected: Any,
    zones: dict[int, Any],
    *,
    region: Any,
) -> bool:
    if feature_kind == "peak":
        return bool(tags.get("ele"))
    if feature_kind in ("beach", "runway"):
        return bool(shape.intersects(region))
    radius = 1500 if feature_kind in ("road", "railway") else 2500
    return bool(projected.intersects(zones[radius]))


def run() -> None:
    if not (REGION / "hotels.csv.gz").exists():
        raise FileNotFoundError("Keep the selected hotels.csv.gz catalog; it is an input snapshot")
    records = [record for layer in pbf.LAYERS for record in pbf.regional_records(layer)]
    export(records)
    sea.run([r["geometry"] for r in records if r["tags"].get("natural") == "coastline"])
