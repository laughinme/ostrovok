from pathlib import Path

import numpy as np
import pytest

from app.domain.geo.earth import ray_coordinates
from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import LonLat
from app.infra.geo.terrain import NpyTerrain
from pipeline.storage import read_csv

REGION = Path(__file__).resolve().parents[3] / "data" / "region"


@pytest.mark.skipif(not (REGION / "dem.json").exists(), reason="DEM not published")
def test_real_dem_elevations_and_coverage() -> None:
    terrain = NpyTerrain(REGION)
    points = np.array([[39.8436, 43.5505], [40.3110, 43.6250], [39.70, 43.55]])
    ahun, rosa, sea = terrain.elevation(points)
    assert 600 < ahun < 710
    assert 2200 < rosa < 2400
    assert abs(sea) < 2
    for hotel in read_csv("hotels.csv.gz"):
        origin = LonLat(float(hotel["lon"]), float(hotel["lat"]))
        xy = ray_coordinates(np.zeros(2), np.arange(0, 360, 10), np.array([0, 1000, 40000]))
        samples = LocalProjection(origin).inverse(xy).reshape(-1, 2)
        assert np.isfinite(terrain.elevation(samples)).all(), hotel["osm_id"]
    assert (REGION / "dem_int16.npy").stat().st_size < 25_000_000


def test_dem_mosaic_preserves_nodata(tmp_path: Path) -> None:
    rasterio = pytest.importorskip("rasterio")
    from rasterio.transform import from_origin  # noqa: PLC0415

    from pipeline.dem import RESOLUTION, build_dem  # noqa: PLC0415

    path = tmp_path / "tile.tif"
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=4,
        width=4,
        count=1,
        dtype="float32",
        crs="EPSG:4326",
        transform=from_origin(40, 44, RESOLUTION, RESOLUTION),
        nodata=-9999,
    ) as dataset:
        dataset.write(np.full((4, 4), 660.4, dtype=np.float32), 1)
    build_dem([path], (40, 44 - 4 * RESOLUTION, 40 + 8 * RESOLUTION, 44), tmp_path)
    terrain = NpyTerrain(tmp_path)
    result = terrain.elevation(
        np.array([[40 + RESOLUTION, 44 - RESOLUTION], [40 + 6 * RESOLUTION, 44 - RESOLUTION]])
    )
    assert result[0] == 660
    assert np.isnan(result[1])
