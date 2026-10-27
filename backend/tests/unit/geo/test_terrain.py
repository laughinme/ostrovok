import json
from pathlib import Path

import numpy as np
import pytest

from app.domain.geo.earth import CURVATURE
from app.domain.geo.types import LonLat
from app.infra.geo.terrain import NpyTerrain


def write_dem(path: Path, grid: np.ndarray, *, transform: list[float] | None = None) -> None:
    np.save(path / "dem_int16.npy", grid)
    metadata = {
        "crs": "EPSG:4326",
        "transform": transform or [0.01, 0, 39, 0, -0.01, 44],
        "nodata": -32768,
    }
    (path / "dem.json").write_text(json.dumps(metadata))


def test_bilinear_plane_centres_edges_and_outside(tmp_path: Path) -> None:
    write_dem(tmp_path, np.array([[0, 10, 20], [20, 30, 40], [40, 50, 60]], dtype=np.int16))
    dem = NpyTerrain(tmp_path)
    values = dem.elevation(
        np.array([[39.005, 43.995], [39.01, 43.99], [39, 44], [39.03, 43.97], [38.9, 44]])
    )
    np.testing.assert_allclose(values[:4], [0, 15, 0, 60], atol=1e-8)
    assert np.isnan(values[4])


def test_nodata_only_matters_when_weighted(tmp_path: Path) -> None:
    write_dem(tmp_path, np.array([[1, -32768], [3, 4]], dtype=np.int16))
    values = NpyTerrain(tmp_path).elevation(np.array([[39.005, 43.995], [39.01, 43.99]]))
    assert values[0] == pytest.approx(1)
    assert np.isnan(values[1])


def test_rotated_affine(tmp_path: Path) -> None:
    transform = [0.01, 0.002, 39, 0.001, -0.01, 44]
    write_dem(tmp_path, np.array([[0, 10], [20, 30]], dtype=np.int16), transform=transform)
    np.testing.assert_allclose(
        NpyTerrain(tmp_path).elevation(np.array([[39.012, 43.991]])), [15], atol=1e-8
    )


def test_flat_earth_horizon_and_cache(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    write_dem(
        tmp_path, np.zeros((200, 200), dtype=np.int16), transform=[0.001, 0, 39.6, 0, -0.001, 43.7]
    )
    dem = NpyTerrain(tmp_path)
    origin, azimuths = LonLat(39.7, 43.6), np.array([0.0, 90, 180, 270])
    angle, distance = dem.far_horizon(origin, 1, azimuths, max_km=5)
    tangent_m = np.sqrt(1 / CURVATURE)
    np.testing.assert_allclose(distance, tangent_m, atol=60)
    np.testing.assert_allclose(angle, np.degrees(-2 * np.sqrt(CURVATURE)), atol=0.001)

    def unexpected(*args: object) -> None:
        pytest.fail("Cached horizon must not resample DEM")

    monkeypatch.setattr(dem, "elevation", unexpected)
    angle[:] = 999
    cached, _ = dem.far_horizon(origin, 1, azimuths, max_km=5)
    assert np.all(cached < 0)


def test_far_horizon_missing_coverage_is_unknown(tmp_path: Path) -> None:
    write_dem(tmp_path, np.zeros((2, 2), dtype=np.int16))
    angles, distances = NpyTerrain(tmp_path).far_horizon(LonLat(30, 40), 20, np.array([270.0]))
    assert np.isnan(angles[0])
    assert np.isnan(distances[0])
