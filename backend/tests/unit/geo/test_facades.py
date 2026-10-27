from math import cos, radians, sin

import pytest
from shapely import Point, Polygon, box
from shapely.affinity import rotate

from app.domain.geo.facades import extract_facades, window_points
from app.domain.knowledge.scope import Facade


@pytest.mark.parametrize("angle", [0, 45])
@pytest.mark.parametrize("reverse", [False, True])
def test_rectangle_outward_normals(angle: float, reverse: bool) -> None:
    footprint = rotate(box(0, 0, 20, 10), angle)
    if reverse:
        footprint = Polygon(list(footprint.exterior.coords)[::-1])
    walls = extract_facades(footprint)
    assert len(walls) == 4
    expected = {Facade.N, Facade.E, Facade.S, Facade.W}
    if angle:
        expected = {Facade.NE, Facade.SE, Facade.SW, Facade.NW}
    assert {wall.facade for wall in walls} == expected
    for wall in walls:
        x, y = wall.point(0.5)
        azimuth = radians(wall.azimuth_deg)
        assert not footprint.covers(Point(x + sin(azimuth), y + cos(azimuth)))


def test_l_shape_keeps_separate_walls_and_floors() -> None:
    footprint = Polygon([(0, 0), (20, 0), (20, 10), (10, 10), (10, 20), (0, 20)])
    walls = extract_facades(footprint)
    assert len(walls) == 6
    assert len([wall for wall in walls if wall.facade == Facade.N]) == 2
    windows = window_points(walls, 3, 12)
    assert len(windows) == 54
    assert {w.elevation_m for w in windows} == {13.5, 16.5, 19.5}
    assert all(footprint.boundary.distance(Point(w.xy)) < 1e-8 for w in windows)


def test_merge_collinear_across_ring_start_and_exclude_courtyard() -> None:
    footprint = Polygon(
        [(5, 0), (10, 0), (10, 10), (0, 10), (0, 0)], holes=[box(2, 2, 4, 4).exterior.coords]
    )
    walls = extract_facades(footprint)
    assert len(walls) == 4
    assert sum(w.length_m for w in walls) == 40


def test_invalid_footprint_and_floor_count() -> None:
    with pytest.raises(ValueError, match="polygon"):
        extract_facades(Polygon())
    with pytest.raises(ValueError, match="positive"):
        window_points(extract_facades(box(0, 0, 10, 10)), 0, 0)


@pytest.mark.parametrize("bend", [-0.1, 0.1])
def test_merge_almost_collinear_edges_preserves_window_geometry(bend: float) -> None:
    footprint = Polygon([(0, 0), (5, bend), (10, 0), (10, 10), (0, 10)])
    walls = extract_facades(footprint)
    assert len(walls) == 4
    assert all(
        footprint.boundary.distance(Point(window.xy)) < 1e-8
        for window in window_points(walls, 1, 0)
    )
