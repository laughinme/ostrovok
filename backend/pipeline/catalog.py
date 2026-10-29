from typing import Any

from shapely import STRtree

from pipeline.geography import DISTRICTS, geometry, height, identifier, metric
from pipeline.storage import REGION, overpass, write_csv, write_json

HOTEL_FIELDS = [
    "osm_id",
    "name",
    "district",
    "tourism",
    "stars",
    "lon",
    "lat",
    "building_osm_id",
    "footprint_wkb",
    "height_m",
    "levels",
    "height_source",
    "addr",
    "osm_timestamp",
]


def fetch_candidates(district: str, bounds: tuple[float, ...]) -> list[dict[str, Any]]:
    west, south, east, north = bounds
    bbox = f"({south},{west},{north},{east})"
    body = (
        '(nwr["tourism"~"^(hotel|guest_house|apartment)$"]["name"]' + bbox + ";"
        'way["building"]' + bbox + ';rel["building"]' + bbox + ";)"
    )
    if district == "krasnaya_polyana":
        body = 'nw["tourism"~"^(hotel|guest_house|apartment)$"]["name"]' + bbox
    return (
        overpass(body, seconds=30)["elements"]
        if district == "krasnaya_polyana"
        else overpass(body)["elements"]
    )


def select_hotels() -> list[dict[str, Any]]:
    selected, used = [], set()
    report = {}
    for district, (bounds, quota) in DISTRICTS.items():
        elements = fetch_candidates(district, bounds)
        member_ids = {
            m["ref"]
            for e in elements
            if e["type"] == "relation" and e.get("tags", {}).get("building")
            for m in e.get("members", [])
            if m["type"] == "way"
        }
        buildings = []
        for element in elements:
            if element["type"] == "way" and element["id"] in member_ids:
                continue
            if element.get("tags", {}).get("building") not in (None, "no"):
                shape = geometry(element, area=True)
                if shape.geom_type in ("Polygon", "MultiPolygon") and not shape.is_empty:
                    buildings.append((element, shape, metric(shape)))
        tree = STRtree([b[2] for b in buildings])
        candidates = []
        for element in sorted(elements, key=identifier):
            tags = element.get("tags", {})
            if element["type"] == "relation":
                continue
            if tags.get("tourism") not in ("hotel", "guest_house", "apartment") or not tags.get(
                "name"
            ):
                continue
            shape = geometry(element, area=True)
            point = shape.representative_point()
            indices = tree.query(metric(point), predicate="intersects")
            if not len(indices):
                continue
            building, footprint, _ = min((buildings[i] for i in indices), key=lambda b: b[2].area)
            building_id = identifier(building)
            if building_id in used:
                continue
            h, levels, source = height(building["tags"])
            candidates.append(
                {
                    "osm_id": identifier(element),
                    "name": tags["name"],
                    "district": district,
                    "tourism": tags["tourism"],
                    "stars": tags.get("stars", ""),
                    "lon": point.x,
                    "lat": point.y,
                    "building_osm_id": building_id,
                    "footprint_wkb": footprint.wkb_hex,
                    "height_m": h,
                    "levels": levels,
                    "height_source": source,
                    "addr": " ".join(
                        tags.get(k, building["tags"].get(k, ""))
                        for k in ["addr:street", "addr:housenumber"]
                    ).strip(),
                    "osm_timestamp": element["timestamp"],
                }
            )
            used.add(building_id)
            if len(candidates) == quota:
                break
        report[district] = {
            "selected": len(candidates),
            "quota": quota,
            "osm_elements": len(elements),
        }
        selected.extend(candidates)
        print(f"Hotels {district}: {len(candidates)}/{quota}", flush=True)
    if len(selected) < min(180, sum(quota for _, quota in DISTRICTS.values())):
        raise ValueError(f"Insufficient building-linked hotels: {report}")
    selected.sort(key=lambda row: row["osm_id"])
    write_csv("hotels.csv.gz", HOTEL_FIELDS, selected)
    write_json(REGION / "hotel_selection.json", report)
    return selected
