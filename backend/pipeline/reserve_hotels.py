"""Select live-onboarding hotels inside the existing catalog's complete OSM buffers."""

from typing import Any

from shapely import Point, STRtree, box, from_wkb

from pipeline import pbf
from pipeline.catalog import HOTEL_FIELDS
from pipeline.geography import DISTRICTS, metric
from pipeline.osm import hotel_buffers
from pipeline.storage import read_csv, write_csv

PER_DISTRICT = 4
BUFFER_RADII = (1500, 2000, 2500)


def candidates(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    primary = read_csv("hotels.csv.gz")
    used = {h["building_osm_id"] for h in primary}
    names = {h["name"].casefold() for h in primary}
    buildings = read_csv("buildings.csv.gz")
    footprints = [from_wkb(bytes.fromhex(b["wkb"])) for b in buildings]
    tree = STRtree(footprints)
    zones = {r: hotel_buffers(r) for r in BUFFER_RADII}
    result = []
    for record in sorted(records, key=lambda r: r["osm_id"]):
        tags, shape = record["tags"], record["geometry"]
        if tags.get("tourism") not in ("hotel", "guest_house", "apartment"):
            continue
        if not tags.get("name") or tags["name"].casefold() in names:
            continue
        point = shape.representative_point()
        district = next((d for d, (b, _) in DISTRICTS.items() if box(*b).covers(point)), None)
        if district is None:
            continue
        indices = tree.query(point, predicate="intersects")
        if not len(indices):
            continue
        index = min(indices, key=lambda i: footprints[i].area)
        building = buildings[index]
        if building["osm_id"] in used:
            continue
        projected = metric(point)
        if any(not zones[r].covers(projected.buffer(r)) for r in BUFFER_RADII):
            continue
        result.append(_row(record, building, point, district))
        used.add(building["osm_id"])
        names.add(tags["name"].casefold())
    return result


def _row(
    record: dict[str, Any], building: dict[str, str], point: Point, district: str
) -> dict[str, Any]:
    tags = record["tags"]
    return {
        "osm_id": record["osm_id"],
        "name": tags["name"],
        "district": district,
        "tourism": tags["tourism"],
        "stars": tags.get("stars", ""),
        "lon": point.x,
        "lat": point.y,
        "building_osm_id": building["osm_id"],
        "footprint_wkb": building["wkb"],
        "height_m": building["height_m"],
        "levels": building["levels"],
        "height_source": building["height_source"],
        "addr": " ".join(tags.get(k, "") for k in ("addr:street", "addr:housenumber")).strip(),
        "osm_timestamp": tags.get("osm_timestamp", ""),
    }


def run() -> None:
    records = [
        r
        for layer in ("points", "multipolygons")
        for r in pbf.regional_records(layer, where="tourism IS NOT NULL AND name IS NOT NULL")
    ]
    rows = candidates(records)
    selected = []
    for district in DISTRICTS:
        own = sorted(
            (r for r in rows if r["district"] == district),
            key=lambda r: (float(r["levels"] or 3), r["osm_id"]),
        )[:PER_DISTRICT]
        selected.extend(own)
        print(f"Reserve {district}: {len(own)}", flush=True)
    if len(selected) < 15:
        raise ValueError(f"Only {len(selected)} hotels have complete existing OSM buffers")
    write_csv("reserve_hotels.csv.gz", HOTEL_FIELDS, selected)
    print(f"Reserve: {len(selected)} hotels; primary catalog and buildings unchanged", flush=True)


if __name__ == "__main__":
    run()
