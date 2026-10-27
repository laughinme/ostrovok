import numpy as np
from shapely import Polygon, box

from app.domain.geo.intersections import building_intersections
from app.domain.geo.scene import Building


def test_courtyard_and_concave_roof_intervals() -> None:
    footprint = Polygon(
        box(0, 10, 10, 40).exterior.coords, holes=[box(2, 20, 8, 30).exterior.coords]
    )
    building = Building("way/1", footprint, 5, 30, "osm_height")
    hits = building_intersections((5, 0), np.array([0.0]), [building])
    np.testing.assert_allclose(sorted(hits.near_m), [10, 30])
    np.testing.assert_allclose(sorted(hits.far_m), [20, 40])
    np.testing.assert_allclose(hits.roof_m, [35, 35])


def test_wall_contact_and_tangent_do_not_block_but_other_wing_does() -> None:
    contact = Building("way/1", box(-10, -10, 10, 0), 0, 30)
    tangent = Building("way/2", box(0, 10, 10, 20), 0, 30)
    hits = building_intersections((0, 0), np.array([0.0]), [contact, tangent])
    assert len(hits.ray) == 0
    wing = Building(
        "way/1",
        Polygon([(-10, -10), (10, -10), (10, 30), (-10, 30), (-10, 20), (5, 20), (5, 0), (-10, 0)]),
        0,
        30,
    )
    hits = building_intersections((0, 0), np.array([0.0]), [wing])
    np.testing.assert_allclose(hits.near_m, [20])
    np.testing.assert_allclose(hits.far_m, [30])
