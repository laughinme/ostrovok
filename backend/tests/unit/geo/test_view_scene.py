import numpy as np
from shapely import box

from app.domain.geo.ground import correct_dsm
from app.domain.geo.horizon import evaluate_horizon
from app.domain.geo.projection import LocalProjection
from app.domain.geo.scene import Building
from app.domain.geo.types import LonLat
from app.infra.geo.view_scene import ViewSceneBuilder


class FlatTerrain:
    def elevation(self, points: np.ndarray) -> np.ndarray:
        return np.zeros(len(points))

    def far_horizon(self, *args: object, **kwargs: object) -> tuple[np.ndarray, np.ndarray]:
        raise AssertionError("Ordered visibility requires terrain samples, not just far skyline")


def test_prepare_view_with_injected_terrain_and_building_base_estimation() -> None:
    builder = ViewSceneBuilder(FlatTerrain(), LocalProjection(LonLat(39.7, 43.6)), max_km=1)
    buildings = builder.buildings_with_bases([Building("way/1", box(-10, -10, 10, 0), 999, 30)])
    assert buildings[0].base_elevation_m == 0
    scene = builder.prepare((0, 0), 0, buildings, box(-2000, 100, 2000, 2000))
    assert len(scene.hits.ray) == 0
    assert evaluate_horizon(scene, 15).sea_fraction == 1


def test_dsm_correction_prevents_double_counting_and_keeps_distant_land() -> None:
    buildings = [Building("way/1", box(-5, -5, 5, 5), 10, 30)]
    xy = np.array([[[0.0, 0], [10, 0], [100, 0]]])
    heights = np.array([[40.0, 25, 100]])
    np.testing.assert_allclose(correct_dsm(xy, heights, buildings), [[10, 10, 100]])
    np.testing.assert_allclose(heights, [[40, 25, 100]])
