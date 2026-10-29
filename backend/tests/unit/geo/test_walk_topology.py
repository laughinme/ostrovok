import numpy as np
import pytest
from shapely import LineString, box

from app.infra.geo.walk_graph import WalkGraph

topology = pytest.importorskip("pipeline.walk_topology", exc_type=ImportError)
geography = pytest.importorskip("pipeline.geography", exc_type=ImportError)


def way(ref, coordinates, **tags):
    return {
        "osm_id": ref,
        "geometry": LineString(coordinates),
        "tags": {"highway": "footway", "surface": "concrete", **tags},
    }


def test_intermediate_nodes_connect_and_preserve_steps_and_direction():
    a, b, c, d = (39.7, 43.6), (39.701, 43.6), (39.702, 43.6), (39.701, 43.601)
    records = [
        way("way/1", [a, b, c], highway="steps", step_count="100"),
        way("way/2", [b, d], **{"oneway:foot": "yes"}),
    ]
    network = topology.extract_network(records, geography.metric(box(39.69, 43.59, 39.71, 43.61)))
    graph = topology.build_graph(network, lambda xy: xy[:, 0] * 10)
    assert graph.nodes.shape == (4, 3)
    assert len(graph.edges) == 5
    assert graph.steps.sum() == 200
    assert np.allclose(graph.nodes[:, 2], graph.nodes[:, 0] * 10)
    assert graph.osm_refs == ("way/1",) * 4 + ("way/2",)
    assert not graph.uncertain.any()


def test_coincident_interiors_do_not_join_bridge_to_road():
    a, b, c = (39.7, 43.6), (39.701, 43.6), (39.702, 43.6)
    network = topology.extract_network(
        [
            way("way/1", [a, b, c], bridge="yes"),
            way("way/2", [(39.701, 43.599), b, (39.701, 43.601)]),
            way("way/3", [(39.699, 43.6), a]),
        ],
        geography.metric(box(39.69, 43.59, 39.71, 43.61)),
    )
    graph = topology.build_graph(network, lambda xy: np.zeros(len(xy)))
    assert graph.nodes.shape == (7, 3)


def test_blocked_node_splits_network_and_archive_loads(tmp_path):
    a, b, c, d = (39.7, 43.6), (39.701, 43.6), (39.702, 43.6), (39.703, 43.6)
    network = topology.extract_network(
        [way("way/1", [a, b, c, d])], geography.metric(box(39.69, 43.59, 39.71, 43.61))
    )
    graph = topology.build_graph(network, lambda xy: np.zeros(len(xy)), blocked={b})
    assert len(graph.edges) == 2
    path = tmp_path / "graph.npz"
    writer = pytest.importorskip("pipeline.graph", exc_type=ImportError)
    writer.save_graph(graph, path)
    first = path.read_bytes()
    writer.save_graph(graph, path)
    assert path.read_bytes() == first
    loaded = WalkGraph.from_file(path)
    np.testing.assert_equal(loaded.nodes, graph.nodes)
    np.testing.assert_equal(loaded.edges, graph.edges)


def test_missing_dem_is_rejected():
    network = topology.extract_network(
        [way("way/1", [(39.7, 43.6), (39.701, 43.6)])],
        geography.metric(box(39.69, 43.59, 39.71, 43.61)),
    )
    with pytest.raises(ValueError, match="DEM coverage"):
        topology.build_graph(network, lambda xy: np.full(len(xy), np.nan))
