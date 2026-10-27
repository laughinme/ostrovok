from pathlib import Path

import numpy as np
import pytest

from app.domain.geo.types import WalkProfile
from app.infra.geo.walk_graph import ProfileGraph, WalkGraph
from tests.unit.geo.graph_factory import make_graph


def test_npz_roundtrip_and_parallel_arcs(tmp_path: Path) -> None:
    graph = make_graph([(39.7, 43.6, 0), (39.7, 43.601, 10)], [(0, 1), (0, 1)], [100, 200])
    path = tmp_path / "walk_graph.npz"
    np.savez_compressed(
        path,
        nodes=graph.nodes,
        edges=graph.edges,
        length_m=graph.length_m,
        steps=graph.steps,
        crossings=graph.crossings,
        uncertain=graph.uncertain,
        osm_refs=np.array(graph.osm_refs, dtype=np.str_),
    )
    loaded = WalkGraph.from_file(path)
    indexed = ProfileGraph.build(loaded, WalkProfile.WALK)
    assert indexed.edge_indices[(0, 1)] == 0
    assert indexed.matrix.nnz == 1
    assert loaded.edge(0).rise_m == 10
    assert loaded.osm_refs == graph.osm_refs
    assert not loaded.nodes.flags.writeable


def test_steps_are_removed_for_mobility_profiles() -> None:
    graph = make_graph([(39.7, 43.6, 0), (39.7, 43.601, 0)], [(0, 1)], [100], steps=[10])
    assert ProfileGraph.build(graph, WalkProfile.WALK).matrix.nnz == 1
    assert ProfileGraph.build(graph, WalkProfile.STROLLER).matrix.nnz == 0
    assert ProfileGraph.build(graph, WalkProfile.WHEELCHAIR).matrix.nnz == 0


@pytest.mark.parametrize("length", [0, -1, float("nan")])
def test_bad_lengths_rejected(length: float) -> None:
    with pytest.raises(ValueError, match=r"graph|Graph"):
        make_graph([(39.7, 43.6, 0)], [(0, 0)], [length])


def test_missing_node_rejected() -> None:
    with pytest.raises(ValueError, match="bounds"):
        make_graph([(39.7, 43.6, 0)], [(0, 1)], [100])
