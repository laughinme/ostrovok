"""Regression tests for OSM topology and provenance; no network."""

import pytest
from shapely import Point

from pipeline.geography import geometry, height, metric
from pipeline.osm import kind


@pytest.mark.parametrize(
    ("tags", "expected"),
    [
        ({"height": "12,5 m", "building:levels": "4"}, (12.5, 4, "osm_height")),
        ({"height": "unknown", "building:levels": "5"}, (15, 5, "osm_levels")),
        ({"height": "-1", "building:levels": "0"}, (9, 3, "default")),
    ],
)
def test_height_provenance(tags, expected):
    assert height(tags) == expected


def test_multipolygon_preserves_courtyard():
    def ring(low, high):
        return [
            {"lon": x, "lat": y}
            for x, y in [(low, low), (high, low), (high, high), (low, high), (low, low)]
        ]

    shape = geometry(
        {
            "type": "relation",
            "members": [
                {"type": "way", "role": "outer", "geometry": ring(0, 3)},
                {"type": "way", "role": "inner", "geometry": ring(1, 2)},
            ],
        },
        area=True,
    )
    assert shape.area == 8
    assert not shape.contains(Point(1.5, 1.5))
    assert shape.contains(Point(0.5, 0.5))


def test_distances_are_metric():
    assert 75 < metric(Point(39.73, 43.6)).distance(metric(Point(39.731, 43.6))) < 85


@pytest.mark.parametrize(
    ("tags", "expected"),
    [
        ({"amenity": "nightclub"}, "bar_club"),
        ({"railway": "station"}, "station"),
        ({"building": "construction"}, "construction"),
        ({"highway": "primary"}, "road"),
        ({"natural": "beach"}, "beach"),
    ],
)
def test_feature_precedence(tags, expected):
    assert kind(tags) == expected
