from math import log10

import pytest
from shapely import LineString, Point, box

from app.domain.geo.noise import NoiseSource, energy_sum, facade_noise, orientation_loss


def railway(y: float = 20) -> NoiseSource:
    return NoiseSource("way/123", "rail", LineString([(-100, y), (100, y)]), 75, 75)


def test_distance_and_building_reduce_noise() -> None:
    near = facade_noise(Point(0, 0), 0, [railway()], "day")
    far = facade_noise(Point(0, -20), 0, [railway()], "day")
    screened = facade_noise(Point(0, 0), 0, [railway()], "day", buildings=[box(-5, 5, 5, 10)])
    assert near.index_db == pytest.approx(75 - 20 * log10(20))
    assert far.index_db < near.index_db
    assert screened.index_db == pytest.approx(near.index_db - 10)
    assert screened.sources[0].screened
    assert near.sources[0].osm_ref == "way/123"


def test_orientation_and_energy_sum() -> None:
    front = facade_noise(Point(0, 0), 0, [railway()], "night")
    rear = facade_noise(Point(0, 0), 180, [railway()], "night")
    assert rear.index_db == pytest.approx(front.index_db - 15)
    assert orientation_loss(359, 1) == 0
    assert orientation_loss(0, 135) == 10
    assert energy_sum([50, 50]) == pytest.approx(53.01029996)


def test_confidence_tracks_margin_and_completeness() -> None:
    boundary = NoiseSource("node/1", "road", Point(0, 1), 45, 45)
    clear = NoiseSource("node/2", "road", Point(0, 1), 55, 55)
    near = facade_noise(Point(0, 0), 0, [boundary], "day", road_completeness=1)
    far = facade_noise(Point(0, 0), 0, [clear], "day", road_completeness=1)
    incomplete = facade_noise(Point(0, 0), 0, [clear], "day", road_completeness=0.3)
    assert near.confidence < far.confidence <= 0.75
    assert incomplete.confidence < far.confidence


def test_inactive_and_missing_sources_are_unknown() -> None:
    construction = NoiseSource("way/2", "construction", Point(1, 0), 65, None)
    result = facade_noise(Point(0, 0), 90, [construction], "night")
    assert result.index_db is None
    assert result.category is None
    assert result.confidence == 0
    assert facade_noise(Point(1, 0), 0, [railway()], "night").category == "шумно"


def test_top_sources_do_not_truncate_total_energy() -> None:
    result = facade_noise(Point(0, 0), 0, [railway(), railway()], "day", top_n=1)
    assert len(result.sources) == 1
    assert result.index_db == pytest.approx(75 - 20 * log10(20) + 10 * log10(2))


def test_tangent_does_not_screen_but_hotel_footprint_does() -> None:
    baseline = facade_noise(Point(0, 0), 0, [railway()], "day")
    tangent = facade_noise(Point(0, 0), 0, [railway()], "day", buildings=[box(0, 5, 5, 10)])
    through_hotel = facade_noise(
        Point(0, 0), 0, [railway(-20)], "day", buildings=[box(-5, -5, 5, 0)]
    )
    # A ray along a wall is a tangent, not a crossing of the building interior.
    assert tangent.index_db == baseline.index_db
    assert through_hotel.sources[0].screened


def test_small_distances_and_extreme_powers_remain_finite() -> None:
    source = NoiseSource("node/1", "road", Point(0, 0), 10000, 10000)
    assert facade_noise(Point(0, 0), 0, [source], "day").index_db == 10000
    assert energy_sum([10000, 10000]) == pytest.approx(10003.01029996)
