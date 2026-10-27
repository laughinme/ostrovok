import csv
import gzip
from pathlib import Path

import numpy as np
import pytest

from app.domain.geo.types import LonLat
from app.infra.geo.terrain import NpyTerrain

REGION = Path(__file__).resolve().parents[3] / "data" / "region"


@pytest.mark.skipif(not (REGION / "dem.json").exists(), reason="B1.3 DEM not published")
def test_real_dem_covers_hotels_and_coastal_horizon() -> None:
    terrain = NpyTerrain(REGION)
    with gzip.open(REGION / "hotels.csv.gz", "rt") as stream:
        hotels = list(csv.DictReader(stream))
    points = np.array([[float(h["lon"]), float(h["lat"])] for h in hotels])
    heights = terrain.elevation(points)
    assert np.all(np.isfinite(heights))
    assert np.all((heights >= -100) & (heights < 4000))
    angles, distances = terrain.far_horizon(LonLat(39.7231, 43.5855), 30, np.array([225.0, 270.0]))
    assert np.all(np.isfinite(angles))
    assert np.all((distances > 0) & (distances <= 40_000))
