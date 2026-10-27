"""Validated, directed, unsimplified graph archive shared with the offline pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
from pathlib import Path
from typing import Self

import numpy as np
from numpy.typing import NDArray
from scipy.sparse import csr_matrix

from app.domain.geo.projection import FloatArray
from app.domain.geo.types import WalkProfile
from app.domain.geo.walking import WalkEdge, edge_minutes

type IntArray = NDArray[np.int64]
NODE_COLUMNS = 3
EDGE_COLUMNS = 2
LON_LIMIT = 180
LAT_LIMIT = 90


@dataclass(frozen=True, slots=True)
class WalkGraph:
    nodes: FloatArray
    """(n, 3): WGS84 longitude, latitude, elevation in metres."""
    edges: IntArray
    """(m, 2): directed zero-based node indices; each reverse arc must be explicit."""
    length_m: FloatArray
    steps: IntArray
    crossings: IntArray
    uncertain: NDArray[np.bool_]
    osm_refs: tuple[str, ...]

    def __post_init__(self) -> None:
        if (
            self.nodes.ndim != EDGE_COLUMNS
            or self.nodes.shape[1] != NODE_COLUMNS
            or not len(self.nodes)
        ):
            raise ValueError("Graph nodes must have shape (n, 3), n > 0")
        if self.edges.ndim != EDGE_COLUMNS or self.edges.shape[1] != EDGE_COLUMNS:
            raise ValueError("Graph edges must have shape (m, 2)")
        if not np.all(np.isfinite(self.nodes)) or not np.all(np.isfinite(self.length_m)):
            raise ValueError("Nonfinite graph values")
        if np.any(np.abs(self.nodes[:, 0]) > LON_LIMIT) or np.any(
            np.abs(self.nodes[:, 1]) >= LAT_LIMIT
        ):
            raise ValueError("Graph coordinates must be nonpolar WGS84")
        arrays = (self.length_m, self.steps, self.crossings, self.uncertain)
        if any(array.shape != (len(self.edges),) for array in arrays) or len(self.osm_refs) != len(
            self.edges
        ):
            raise ValueError("Edge attribute lengths do not match")
        if np.any(self.edges < 0) or np.any(self.edges >= len(self.nodes)):
            raise ValueError("Graph edge index out of bounds")
        if np.any(self.length_m <= 0) or np.any(self.steps < 0) or np.any(self.crossings < 0):
            raise ValueError("Invalid graph length or count")
        for array in (self.nodes, self.edges, *arrays):
            array.setflags(write=False)

    @classmethod
    def from_file(cls, path: Path) -> Self:
        """Read numeric/string NPZ arrays without pickle, rejecting fractional indices."""
        with np.load(path, allow_pickle=False) as data:
            edges = _integers(data["edges"])
            steps = _integers(data["steps"])
            crossings = _integers(data["crossings"])
            refs = data["osm_refs"]
            if refs.ndim != 1 or refs.dtype.kind != "U":
                raise ValueError("OSM refs must be a one-dimensional Unicode array")
            uncertain = data["uncertain"]
            if uncertain.dtype.kind != "b":
                raise ValueError("Uncertainty must be a boolean array")
            return cls(
                np.asarray(data["nodes"], dtype=np.float64),
                edges,
                np.asarray(data["length_m"], dtype=np.float64),
                steps,
                crossings,
                np.asarray(uncertain, dtype=np.bool_),
                tuple(str(ref) for ref in refs),
            )

    def edge(self, index: int) -> WalkEdge:
        start, end = self.edges[index]
        return WalkEdge(
            float(self.length_m[index]),
            float(self.nodes[end, 2] - self.nodes[start, 2]),
            int(self.steps[index]),
            int(self.crossings[index]),
            bool(self.uncertain[index]),
            self.osm_refs[index],
        )


def _integers(values: NDArray[np.generic]) -> IntArray:
    if values.dtype.kind not in {"i", "u"}:
        raise ValueError("Graph indices and counts must be integer arrays")
    return np.asarray(values, dtype=np.int64)


@dataclass(frozen=True, slots=True)
class ProfileGraph:
    matrix: csr_matrix[np.float64]
    edge_indices: dict[tuple[int, int], int]

    @classmethod
    def build(cls, graph: WalkGraph, profile: WalkProfile) -> Self:
        best: dict[tuple[int, int], tuple[float, int]] = {}
        for index, (start, end) in enumerate(graph.edges):
            edge = graph.edge(index)
            minutes = edge_minutes(edge.length_m, edge.rise_m, profile, steps=edge.steps)
            key = (int(start), int(end))
            if isfinite(minutes) and (key not in best or minutes < best[key][0]):
                best[key] = (minutes, index)
        # CSR sums duplicate arcs; choose the cheapest parallel arc before constructing it.
        keys = list(best)
        rows = np.array([key[0] for key in keys], dtype=np.int32)
        cols = np.array([key[1] for key in keys], dtype=np.int32)
        costs = np.array([best[key][0] for key in keys], dtype=np.float64)
        matrix = csr_matrix((costs, (rows, cols)), shape=(len(graph.nodes), len(graph.nodes)))
        return cls(matrix, {key: best[key][1] for key in keys})
