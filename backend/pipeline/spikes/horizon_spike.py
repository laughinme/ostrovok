# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "numpy>=2,<3", "shapely>=2,<3", "httpx>=0.28,<1",
#   "rasterio>=1.4,<2", "matplotlib>=3.10,<4", "pyproj>=3.7,<4",
# ]
# ///
"""B1.0: uv run backend/pipeline/spikes/horizon_spike.py (no project install needed)."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from time import perf_counter
from typing import Any

import numpy as np
from horizon_data import (
    CACHE,
    Building,
    Dem,
    load_buildings,
    load_hotels,
    load_railways,
    local_projection,
    osm_polygon,
    positive_number,
    project_geometry,
    read_geojson,
    sea_polygon,
    write_geojson,
)
from horizon_geometry import (
    Scene,
    building_intersections,
    evaluate_horizon,
    facade_windows,
    minimum_floor,
    ray_coordinates,
)
from horizon_plot import plot_context, plot_panorama
from shapely import LineString, STRtree, contains_xy, points
from shapely.ops import nearest_points


def prepare_scene(
    origin: np.ndarray,
    azimuths: np.ndarray,
    *,
    buildings: list[Building],
    bases: np.ndarray,
    sea: Any,
    inverse: Any,
    dem: Dem,
    step: int,
) -> Scene:
    distances = np.arange(30.0, 40_000, step)
    distances = np.unique(np.append(distances, 40_000.0))
    xy = ray_coordinates(origin, azimuths, distances)
    lon, lat = inverse.transform(xy[..., 0], xy[..., 1])
    terrain = dem.sample(lon, lat)
    water = contains_xy(sea, xy[..., 0], xy[..., 1])
    near = distances <= 2050
    grid = xy[:, near].reshape(-1, 2)
    tree = STRtree([b.polygon.buffer(20) for b in buildings])
    point_ids, building_ids = tree.query(points(grid), predicate="within")
    ground = terrain[:, near].copy().ravel()
    np.minimum.at(ground, point_ids, bases[building_ids])
    terrain[:, near] = ground.reshape(terrain[:, near].shape)
    hits = building_intersections(
        origin,
        azimuths,
        [b.polygon for b in buildings],
        np.array([base + b.height for base, b in zip(bases, buildings, strict=True)]),
    )
    return Scene(distances, terrain, water, hits)


def hotel_spike(
    key: str, element: dict[str, Any], dem: Dem, step: int, *, include_railways: bool = False
) -> dict[str, Any]:
    geographic = osm_polygon(element)
    centroid = geographic.centroid
    projection, inverse = local_projection(centroid.x, centroid.y)
    polygon = project_geometry(projection, geographic)
    hotel_id = f"way/{element['id']}"
    buildings = load_buildings(centroid.y, centroid.x, key, projection)
    hotel_index = next(i for i, b in enumerate(buildings) if b.osm_id == hotel_id)
    sea_path = CACHE / f"{key}_sea.geojson"
    if sea_path.exists():
        sea = read_geojson(sea_path)
    else:
        sea = sea_polygon(projection)
        write_geojson(sea_path, sea)
    use_railways = include_railways or (CACHE / f"{key}_railways.json").exists()
    railways = load_railways(centroid.y, centroid.x, key, projection) if use_railways else None
    sea_point = nearest_points(polygon.centroid, sea)[1]
    bearing = float(np.degrees(np.arctan2(sea_point.x, sea_point.y)) % 360)
    facades = facade_windows(polygon, bearing)
    bases = dem.ground([b.polygon for b in buildings], inverse)
    ground = float(bases[hotel_index])
    levels = positive_number(element["tags"].get("building:levels"))
    floors = int(levels or buildings[hotel_index].height // 3)
    selected_floors = sorted({min(f, floors) for f in (2, 5, 9)})
    info: dict[str, Any] = {
        "key": key,
        "name": element["tags"]["name"],
        "osm_id": hotel_id,
        "lat": centroid.y,
        "lon": centroid.x,
        "floors": floors,
        "ground_proxy_m": round(ground, 2),
        "buildings": len(buildings),
        "height_tags": sum("height" in b.tags for b in buildings),
        "levels_tags": sum("building:levels" in b.tags for b in buildings),
        "height_sources": dict(Counter(b.height_source for b in buildings)),
        "building_extract_bytes": (CACHE / f"{key}_buildings.json").stat().st_size,
        "shore_distance_m": round(polygon.distance(sea), 1),
        "facades": [],
    }
    print(
        f"\n{info['name']} ({hotel_id}), зданий: {len(buildings)}, основание ≈{ground:.1f} м",
        flush=True,
    )
    for name, origin, normal in facades:
        started = perf_counter()
        azimuths = normal + np.arange(-70.0, 71.0)
        scene = prepare_scene(
            origin,
            azimuths,
            buildings=buildings,
            bases=bases,
            sea=sea,
            inverse=inverse,
            dem=dem,
            step=step,
        )
        preparation_ms = (perf_counter() - started) * 1000
        records, results = [], []
        for floor in selected_floors:
            started = perf_counter()
            horizon = evaluate_horizon(scene, ground + (floor - 0.5) * 3)
            elapsed = (perf_counter() - started) * 1000
            results.append(horizon)
            records.append(
                {
                    "floor": floor,
                    "sea_fraction": round(horizon.sea_fraction, 4),
                    "evaluation_ms": round(elapsed, 2),
                    "terrain_horizon_median_deg": round(float(np.median(horizon.terrain)), 2),
                }
            )
        minimum = minimum_floor(scene, ground, floors)
        started = perf_counter()
        for _ in range(20):
            evaluate_horizon(scene, ground + 13.5)
        warm_ms = (perf_counter() - started) * 1000 / 20
        sightline = nearest_points(polygon, sea)
        from_hotel = LineString(sightline)
        rail_crossed = None if railways is None else bool(from_hotel.intersects(railways))
        facet = {
            "name": name,
            "normal_deg": round(normal, 2),
            "window_xy_m": origin.tolist(),
            "min_floor_with_sea": minimum,
            "max_floor_searched": floors,
            "preparation_ms": round(preparation_ms, 2),
            "warm_evaluation_ms": round(warm_ms, 2),
            "roof_intervals": len(scene.hits.ray),
            "floors": records,
            "railway_crossed_to_nearest_coast": rail_crossed,
        }
        info["facades"].append(facet)
        plot_panorama(CACHE / f"{key}_{name}.png", info, facet, azimuths, results)
        np.savez_compressed(
            CACHE / f"{key}_{name}_scene.npz",
            distances=scene.distances,
            terrain=scene.terrain,
            sea=scene.sea,
            ray=scene.hits.ray,
            near=scene.hits.near,
            far=scene.hits.far,
            roof=scene.hits.roof,
            azimuths=azimuths,
        )
        fractions = ", ".join(f"{r['floor']} эт.: {r['sea_fraction']:.1%}" for r in records)
        print(
            f"  {name} {normal:.1f}°: {fractions}; мин. этаж {minimum}; "
            f"подготовка {preparation_ms:.0f} ms, расчёт {warm_ms:.1f} ms",
            flush=True,
        )
    plot_context(
        CACHE / f"{key}_context.png",
        info,
        buildings=buildings,
        polygon=polygon,
        sea=sea,
        railways=railways,
        facades=facades,
    )
    return info


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--hotel",
        choices=("all", "zhemchuzhina", "morskaya_zvezda", "marriott_polyana"),
        default="all",
    )
    parser.add_argument("--step", type=int, choices=(30, 60, 90), default=30)
    parser.add_argument(
        "--railways",
        action="store_true",
        help="Загрузить необязательный слой ж/д для проверки карты",
    )
    args = parser.parse_args()
    dem = Dem()
    hotels = load_hotels()
    results = [
        hotel_spike(key, element, dem, args.step, include_railways=args.railways)
        for key, element in hotels.items()
        if args.hotel in ("all", key)
    ]
    report = {
        "method": "horizon-spike-v1",
        "railways_requested": args.railways,
        "step_m": args.step,
        "azimuth_step_deg": 1,
        "near_m": 2000,
        "far_m": 40000,
        "refraction": 0.13,
        "sea_fraction_definition": "fraction of 141 azimuth bins containing visible water",
        "attribution": "© OpenStreetMap contributors (ODbL); Copernicus DEM GLO-30 (2021)",
        "limitations": [
            "DSM, не DTM: основание здания — 20-й перцентиль кольца в 35 м; ореол крыши 20 м.",
            "Высота без тегов = 9 м; растительность вне OSM-зданий остаётся в DSM.",
            "Море — угловая доля по горизонтали, не площадь картинки и не уверенность.",
            "Фасад — одно реальное ребро; балконы, остекление и ж/д насыпи не моделируются.",
            "Результат номинальный; Монте-Карло и калибровка остаются B2.5.",
        ],
        "hotels": results,
        "dem_tiles_used": sorted([list(key) for key in dem.tiles]),
        "raw_files": {
            p.name: p.stat().st_size for p in CACHE.iterdir() if p.suffix in (".tif", ".json")
        },
    }
    path = CACHE / ("summary.json" if args.hotel == "all" else f"{args.hotel}_summary.json")
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print("\nЗамечания:\n" + "\n".join(report["limitations"]))
    print(f"\nОтчёт: {path}")


if __name__ == "__main__":
    main()
