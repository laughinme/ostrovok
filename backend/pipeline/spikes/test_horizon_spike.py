"""Offline analytical scenes; run pytest on this directory, no external data required."""


# ruff: noqa: S101

import numpy as np
from horizon_data import building_height, positive_number
from horizon_geometry import (
    BUILDING,
    CURVATURE,
    SEA,
    TERRAIN,
    Hits,
    Scene,
    building_intersections,
    evaluate_horizon,
    facade_windows,
    minimum_floor,
)
from shapely import Point, Polygon, box


def scene(roof=None, ridge=False):
    distances = np.arange(30.0, 40_001, 30)
    heights = np.zeros((1, len(distances)))
    water = np.broadcast_to(distances >= 300, heights.shape).copy()
    if ridge:
        heights[0, 100:105] = 800
        water[0, 100:105] = False
    hits = Hits(np.array([], dtype=np.int64), np.array([]), np.array([]), np.array([]))
    if roof is not None:
        hits = Hits(np.array([0]), np.array([100.0]), np.array([120.0]), np.array([roof]))
    return Scene(distances, heights, water, hits)


def test_open_sea_curvature_and_floor_monotonicity():
    result = evaluate_horizon(scene(), 15)
    expected = np.degrees(-2 * np.sqrt(15 * CURVATURE))
    assert result.kind[0] == SEA
    assert result.sea_fraction == 1
    assert abs(result.angle[0] - expected) < 0.001
    assert minimum_floor(scene(), 0, 9) == 1


def test_building_blocks_sea_until_eye_above_roof():
    assert evaluate_horizon(scene(20), 15).kind[0] == BUILDING
    assert not evaluate_horizon(scene(20), 15).sea_visible[0]
    assert evaluate_horizon(scene(20), 27).sea_visible[0]
    assert minimum_floor(scene(20), 0, 9) == 8


def test_foreground_sea_below_mountain_is_still_visible():
    result = evaluate_horizon(scene(ridge=True), 15)
    assert result.kind[0] == TERRAIN
    assert result.sea_visible[0]
    assert result.sea_high[0] < result.angle[0]


def test_land_without_water_never_becomes_sea():
    original = scene()
    land = Scene(original.distances, original.terrain, np.zeros_like(original.sea), original.hits)
    assert evaluate_horizon(land, 100).sea_fraction == 0
    assert minimum_floor(land, 0, 20) is None


def test_exact_intersection_preserves_roof_behind_courtyard():
    polygon = Polygon(
        [(0, 10), (10, 10), (10, 40), (0, 40)], holes=[[(2, 20), (8, 20), (8, 30), (2, 30)]]
    )
    hits = building_intersections(
        np.array([5.0, 0.0]), np.array([0.0]), [polygon], np.array([30.0])
    )
    assert sorted(hits.near) == [10, 30]
    assert sorted(hits.far) == [20, 40]


def test_facade_origins_are_outside_and_normals_opposite():
    polygon = box(-10, -20, 10, 20)
    facades = facade_windows(polygon, 270)
    assert facades[0][2] == 270
    assert facades[1][2] == 90
    assert all(not polygon.contains(Point(origin)) for _, origin, _ in facades)


def test_height_precedence_units_and_unknown_tags():
    assert building_height({"height": "18 m", "building:levels": "4"}) == (18, "height")
    assert building_height({"building:levels": "4"}) == (12, "building:levels")
    assert building_height({"height": "unknown"}) == (9, "default")
    assert positive_number("12,5") == 12.5
    assert positive_number("-5") is None
