import numpy as np
import pytest
from shapely import box

from app.domain.geo.earth import CURVATURE
from app.domain.geo.horizon import batch_horizon, evaluate_horizon
from app.domain.geo.intersections import building_intersections
from app.domain.geo.scene import (
    Building,
    Obstacle,
    RoofHits,
    Scene,
    sample_distances,
    sector_azimuths,
)
from app.domain.geo.sea import minimum_floor


def analytic_scene(*, building: bool = False, ridge: bool = False) -> Scene:
    distances = sample_distances()
    azimuths = sector_azimuths(270)
    terrain = np.zeros((len(azimuths), len(distances)))
    sea = np.broadcast_to(distances >= 300, terrain.shape).copy()
    if ridge:
        terrain[:, 100:105] = 800
        sea[:, 100:105] = False
    buildings = (
        (Building("way/1", box(-70, -2000, -50, 2000), 0, 30, "osm_levels"),) if building else ()
    )
    hits = building_intersections((0, 0), azimuths, buildings) if building else RoofHits.empty()
    return Scene(azimuths, distances, terrain, sea, hits, buildings=buildings)


def test_open_sea_matches_curved_earth_tangent() -> None:
    profile = evaluate_horizon(analytic_scene(), 15)
    assert profile.sea_fraction == 1
    np.testing.assert_allclose(
        profile.angle_deg, np.degrees(-2 * np.sqrt(15 * CURVATURE)), atol=0.001
    )
    assert np.all(profile.kind == Obstacle.SEA)


def test_ten_floor_building_50m_west_blocks_through_floor_seven() -> None:
    scene = analytic_scene(building=True)
    assert evaluate_horizon(scene, 10 + 6.5 * 3).sea_fraction == 0
    assert evaluate_horizon(scene, 10 + 7.5 * 3).sea_fraction == 1
    assert minimum_floor([scene], 10, 10) == 8
    assert minimum_floor([scene], 10, 7) is None


def test_foreground_sea_visible_below_mountain_silhouette() -> None:
    profile = evaluate_horizon(analytic_scene(ridge=True), 15)
    assert profile.sea_fraction == 1
    assert np.all(profile.kind == Obstacle.TERRAIN)
    assert np.all(profile.sea_high_deg < profile.angle_deg)


def test_batch_matches_single_and_land_is_not_sea() -> None:
    scene = analytic_scene(building=True)
    batch = batch_horizon(scene, np.array([20.0, 35]))
    for i, eye in enumerate([20, 35]):
        np.testing.assert_allclose(batch.angle_deg[i], evaluate_horizon(scene, eye).angle_deg)
    land = Scene(
        scene.azimuths_deg, scene.distances_m, scene.terrain_m, np.zeros_like(scene.sea), scene.hits
    )
    assert evaluate_horizon(land, 100).sea_fraction == 0


def test_unknown_terrain_never_becomes_clear_sky() -> None:
    scene = analytic_scene()
    unknown = Scene(
        scene.azimuths_deg,
        scene.distances_m,
        np.full_like(scene.terrain_m, np.nan),
        np.zeros_like(scene.sea),
        scene.hits,
    )
    profile = evaluate_horizon(unknown, 15)
    assert np.all(profile.kind == Obstacle.UNKNOWN)
    assert profile.sea_fraction == 0


def test_roof_tangent_inside_interval_is_included() -> None:
    scene = analytic_scene()
    hits = RoofHits(
        np.array([0]), np.array([100.0]), np.array([30_000.0]), np.array([10.0]), np.array([0])
    )
    long_roof = Scene(scene.azimuths_deg, scene.distances_m, scene.terrain_m, scene.sea, hits)
    expected = np.degrees(np.arctan(-2 * np.sqrt((20 - 10) * CURVATURE)))
    assert evaluate_horizon(long_roof, 20).building_deg[0] == pytest.approx(expected, abs=1e-8)
