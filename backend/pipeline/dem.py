"""Compact Copernicus DSM mosaic with 40 km coverage around the hotel catalog."""

from contextlib import ExitStack
from math import ceil, cos, floor, radians
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.merge import merge

from pipeline.storage import REGION, ROOT, download, read_csv, write_json

NODATA = -32768
RESOLUTION = 2 / 3600  # About 45 x 62 m at Sochi's latitude.
BUFFER_M = 40_200  # Include bilinear neighbours at the end of a 40 km ray.
BASE_URL = "https://copernicus-dem-30m.s3.amazonaws.com"
type Bounds = tuple[float, float, float, float]


def buffered_bounds(hotels: list[dict[str, str]]) -> Bounds:
    """WGS84 bounds enclosing a 40 km circle around every catalog hotel."""
    if not hotels:
        raise ValueError("Cannot build DEM without hotels")
    dlat = BUFFER_M / 111_000
    west, south, east, north = [], [], [], []
    for hotel in hotels:
        lon, lat = float(hotel["lon"]), float(hotel["lat"])
        dlon = BUFFER_M / (111_000 * cos(radians(lat + dlat)))
        west.append(lon - dlon)
        east.append(lon + dlon)
        south.append(lat - dlat)
        north.append(lat + dlat)
    return min(west), min(south), max(east), max(north)


def tile_names(bounds: Bounds) -> list[str]:
    west, south, east, north = bounds
    return [
        f"Copernicus_DSM_COG_10_N{lat:02d}_00_E{lon:03d}_00_DEM"
        for lat in range(floor(south), ceil(north))
        for lon in range(floor(west), ceil(east))
    ]


def build_dem(paths: list[Path], bounds: Bounds, output: Path) -> None:
    """Average to two arcseconds, round metres to int16; preserve holes as nodata."""
    with ExitStack() as stack:
        sources = [stack.enter_context(rasterio.open(path)) for path in paths]
        grid, transform = merge(
            sources,
            bounds=bounds,
            res=RESOLUTION,
            nodata=NODATA,
            dtype="float32",
            resampling=Resampling.average,
            target_aligned_pixels=True,
        )
    if not np.all(np.isfinite(grid)) or np.any((grid < NODATA) | (grid > 32767)):
        raise ValueError("Invalid elevation values")
    output.mkdir(parents=True, exist_ok=True)
    np.save(output / "dem_int16.npy", np.rint(grid[0]).astype(np.int16), allow_pickle=False)
    if (output / "dem_int16.npy").stat().st_size >= 25_000_000:
        raise ValueError("DEM exceeds the 25 MB budget")
    write_json(
        output / "dem.json",
        {
            "crs": "EPSG:4326",
            "transform": list(transform)[:6],
            "nodata": NODATA,
            "shape": list(grid.shape[1:]),
            "units": "metres above EGM2008 geoid",
            "resolution_arcseconds": 2,
            "buffer_m": BUFFER_M,
            "source": "Copernicus DEM GLO-30 (DSM, includes trees and buildings)",
            "resampling": "average, rounded to nearest metre",
            "sources": [f"{BASE_URL}/{p.stem}/{p.stem}.tif" for p in paths],
        },
    )


def run() -> None:
    bounds = buffered_bounds(read_csv("hotels.csv.gz"))
    paths = []
    for name in tile_names(bounds):
        cached = ROOT / ".cache" / "spike" / f"{name}.tif"
        if not cached.exists():
            raw = download(f"{BASE_URL}/{name}/{name}.tif")
            cached.parent.mkdir(parents=True, exist_ok=True)
            cached.write_bytes(raw.read_bytes())
        paths.append(cached)
    build_dem(paths, bounds, REGION)
    print(f"DEM: {len(paths)} tiles, bounds={bounds}", flush=True)
