import numpy as np
import pytest
from shapely import LineString, Point, box

crossings = pytest.importorskip("pipeline.walk_crossings", exc_type=ImportError)
topology = pytest.importorskip("pipeline.walk_topology", exc_type=ImportError)
geography = pytest.importorskip("pipeline.geography", exc_type=ImportError)


def scene(*, explicit=False, bridge=False):
    a, b, c = (39.7, 43.6), (39.701, 43.6), (39.702, 43.6)
    tags = {"highway": "footway", "surface": "concrete"}
    if bridge:
        tags["bridge"] = "yes"
    ways = [
        {"osm_id": "way/1", "tags": tags, "geometry": LineString([a, b, c])},
        {
            "osm_id": "way/2",
            "tags": {"railway": "rail"},
            "geometry": LineString([(39.701, 43.599), (39.701, 43.601)]),
        },
    ]
    points = [{"geometry": Point(b), "tags": {"railway": "level_crossing"}}] if explicit else []
    network = topology.extract_network(ways, geography.metric(box(39.69, 43.59, 39.71, 43.61)))
    return crossings.annotate_crossings(network, ways, points)


@pytest.mark.parametrize("explicit", [False, True])
def test_crossing_is_counted_once_in_each_direction(explicit):
    network = scene(explicit=explicit)
    graph = topology.build_graph(network, lambda xy: np.zeros(len(xy)))
    assert graph.crossings.tolist() == [1, 0, 0, 1]
    assert graph.uncertain.all() == (not explicit)


def test_bridge_over_railway_counts_as_known_crossing():
    network = scene(bridge=True)
    graph = topology.build_graph(network, lambda xy: np.zeros(len(xy)))
    assert graph.crossings.sum() == 2
    assert not graph.uncertain.any()


def test_private_gate_blocks_both_incident_edges_but_foot_override_allows():
    point = {"geometry": Point(39.7, 43.6), "tags": {"barrier": "gate", "access": "private"}}
    assert crossings.blocked_nodes([point]) == {(39.7, 43.6)}
    point["tags"]["foot"] = "yes"
    assert not crossings.blocked_nodes([point])


def test_interior_crossing_counts_both_ways_and_parallel_road_does_not():
    ways = [
        {
            "osm_id": "way/1",
            "tags": {"highway": "footway", "surface": "paved"},
            "geometry": LineString([(39.7, 43.6), (39.702, 43.6)]),
        },
        {
            "osm_id": "way/2",
            "tags": {"highway": "primary"},
            "geometry": LineString([(39.701, 43.599), (39.701, 43.601)]),
        },
        {
            "osm_id": "way/3",
            "tags": {"highway": "primary"},
            "geometry": LineString([(39.699, 43.6), (39.7, 43.6)]),
        },
    ]
    network = topology.extract_network(ways[:1], geography.metric(box(39.69, 43.59, 39.71, 43.61)))
    annotated = crossings.annotate_crossings(network, ways, [])
    assert annotated.segments[0].crossings == 1
    assert annotated.segments[0].uncertain
