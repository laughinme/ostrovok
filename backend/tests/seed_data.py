"""A tiny region for tests: two hotels with real-looking footprints and the demo personas."""

import csv
import gzip
from pathlib import Path

from shapely import Polygon

HOTELS = [
    # osm_id, name, district, lon, lat, levels
    ("way/1", "Маяк", "center", 39.7200, 43.5800, 9),
    ("way/2", "Тихий двор", "khosta", 39.8500, 43.5150, 4),
]

USERS = """
personas:
  - {key: guest_anna, role: guest, name: Анна, title: Гость}
  - {key: hotelier_mayak, role: hotelier, name: Ирина, title: Отельер, hotels: [way/1]}
  - {key: operator, role: operator, name: Оператор, title: Консоль}
"""


def _box(lon: float, lat: float) -> Polygon:
    d_lon, d_lat = 0.0003, 0.0002
    return Polygon(
        [
            (lon - d_lon, lat - d_lat),
            (lon + d_lon, lat - d_lat),
            (lon + d_lon, lat + d_lat),
            (lon - d_lon, lat + d_lat),
        ]
    )


def write_region(data_dir: Path) -> Path:
    (data_dir / "region").mkdir(parents=True, exist_ok=True)
    (data_dir / "demo").mkdir(parents=True, exist_ok=True)
    columns = [
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
    with gzip.open(data_dir / "region" / "hotels.csv.gz", "wt", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        for osm_id, name, district, lon, lat, levels in HOTELS:
            writer.writerow(
                [
                    osm_id,
                    name,
                    district,
                    "hotel",
                    "4",
                    lon,
                    lat,
                    osm_id,
                    _box(lon, lat).wkb_hex,
                    levels * 3,
                    levels,
                    "osm_levels",
                    "",
                    "",
                ]
            )
    (data_dir / "demo" / "users.yaml").write_text(USERS, encoding="utf-8")
    return data_dir
