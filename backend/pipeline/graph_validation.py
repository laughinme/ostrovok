"""Reproducible real-data routing smoke check; diagnostic output stays outside runtime data."""

from collections import Counter
from dataclasses import asdict
from typing import Any

from shapely import from_wkb

from app.domain.geo.types import LonLat, WalkProfile
from app.infra.geo.router import ScipyRouter
from app.infra.geo.walk_graph import WalkGraph
from pipeline.storage import REGION, ROOT, read_csv, write_json

DIAGNOSTICS = ROOT / ".cache" / "osm"


def verify_routes(graph: WalkGraph) -> dict[str, Any]:
    """Require one walk to an OSM beach from each of center/Khosta/Adler, in both directions."""
    router = ScipyRouter(graph)
    hotels = read_csv("hotels.csv.gz")
    beaches = [r for r in read_csv("osm_features.csv.gz") if r["kind"] == "beach"]
    targets = [
        LonLat(p.x, p.y) for r in beaches for p in [from_wkb(r["wkb"]).representative_point()]
    ]
    checks = [
        _district_route(router, hotels, beaches, targets, district)
        for district in ("center", "khosta", "adler")
    ]
    report = {
        "nodes": len(graph.nodes),
        "directed_edges": len(graph.edges),
        "hotel_snaps_within_100m": dict(
            Counter(
                h["district"]
                for h in hotels
                if router.snap(LonLat(float(h["lon"]), float(h["lat"])))
            )
        ),
        "beach_snaps_within_100m": sum(router.snap(t) is not None for t in targets),
        "checks": checks,
        "limitations": "Beach representative points are approximate targets; "
        "entrances have not been verified. "
        "off-graph connectors and missing surface/step counts remain uncertain. "
        "DEM is a DSM; routes and accessibility have not been checked on the ground.",
    }
    DIAGNOSTICS.mkdir(parents=True, exist_ok=True)
    write_json(DIAGNOSTICS / "walk-validation.json", report)
    return report


def _district_route(
    router: ScipyRouter,
    hotels: list[dict[str, str]],
    beaches: list[dict[str, str]],
    targets: list[LonLat],
    district: str,
) -> dict[str, Any]:
    for hotel in hotels:
        if hotel["district"] != district:
            continue
        origin = LonLat(float(hotel["lon"]), float(hotel["lat"]))
        result = router.nearest_of(origin, targets, WalkProfile.WALK)
        if result is None:
            continue
        index, route = result
        print(
            f"Walk smoke / {district}: {hotel['name']} → {beaches[index]['osm_id']}, "
            f"{route.there.length_m:.0f} m, "
            f"{route.there.minutes:.1f}/{route.back.minutes:.1f} min, "
            f"{route.there.steps} steps, {route.there.crossings} crossings",
            flush=True,
        )
        return {
            "district": district,
            "hotel": hotel["osm_id"],
            "name": hotel["name"],
            "beach": beaches[index]["osm_id"],
            "beach_name": beaches[index]["name"],
            "route": asdict(route),
        }
    raise ValueError(f"No beach walk found for smoke-check district {district}")


def run() -> None:
    verify_routes(WalkGraph.from_file(REGION / "walk_graph.npz"))


if __name__ == "__main__":
    run()
