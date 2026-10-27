"""In-memory adapter for the Router port, with separate directed searches both ways."""

from collections.abc import Sequence
from dataclasses import dataclass
from itertools import pairwise
from math import isfinite
from pathlib import Path
from typing import Self

import numpy as np
from numpy.typing import NDArray
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import KDTree

from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import LonLat, Reachable, Route, WalkProfile
from app.domain.geo.walking import WalkEdge, edge_minutes, elevation_profile, route_leg
from app.infra.geo.walk_graph import ProfileGraph, WalkGraph


@dataclass(frozen=True, slots=True)
class Snap:
    node: int
    distance_m: float


class ScipyRouter:
    def __init__(self, graph: WalkGraph, *, max_snap_m: float = 100.0) -> None:
        if not isfinite(max_snap_m) or max_snap_m < 0:
            raise ValueError("Snap distance must be finite and nonnegative")
        self.graph = graph
        self.max_snap_m = max_snap_m
        self._projection = LocalProjection(
            LonLat(float(graph.nodes[:, 0].mean()), float(graph.nodes[:, 1].mean()))
        )
        self._tree = KDTree(self._projection.forward(graph.nodes[:, :2]))
        self._profiles = {profile: ProfileGraph.build(graph, profile) for profile in WalkProfile}

    @classmethod
    def from_file(cls, path: Path, *, max_snap_m: float = 100.0) -> Self:
        return cls(WalkGraph.from_file(path), max_snap_m=max_snap_m)

    def snap(self, point: LonLat) -> Snap | None:
        xy = self._projection.forward(np.array([point.lon, point.lat], dtype=np.float64))
        distance, index = self._tree.query(xy)
        return Snap(int(index), float(distance)) if distance <= self.max_snap_m else None

    def route(self, origin: LonLat, target: LonLat, profile: WalkProfile) -> Route | None:
        start, end = self.snap(origin), self.snap(target)
        if start is None or end is None:
            return None
        matrix = self._profiles[profile].matrix
        there_cost, there_prev = dijkstra(
            matrix, directed=True, indices=start.node, return_predecessors=True
        )
        if not isfinite(float(there_cost[end.node])):
            return None
        back_cost, back_prev = dijkstra(
            matrix, directed=True, indices=end.node, return_predecessors=True
        )
        if not isfinite(float(back_cost[start.node])):
            return None
        there = _path(there_prev, start.node, end.node)
        back = _path(back_prev, end.node, start.node)
        return self._assemble(origin, target, profile, start=start, end=end, there=there, back=back)

    def nearest_of(
        self, origin: LonLat, targets: Sequence[LonLat], profile: WalkProfile
    ) -> tuple[int, Route] | None:
        start = self.snap(origin)
        if start is None or not targets:
            return None
        matrix = self._profiles[profile].matrix
        forward = dijkstra(matrix, directed=True, indices=start.node)
        reverse = dijkstra(matrix.T.tocsr(), directed=True, indices=start.node)
        candidates = []
        for index, target in enumerate(targets):
            end = self.snap(target)
            if end is None or not isfinite(float(reverse[end.node])):
                continue
            minutes = float(forward[end.node]) + _connector_minutes(end, profile)
            if target == origin:
                minutes = 0.0
            if isfinite(minutes):
                candidates.append((minutes, index))
        if not candidates:
            return None
        _, index = min(candidates)
        result = self.route(origin, targets[index], profile)
        return (index, result) if result is not None else None

    def reachable(
        self,
        origin: LonLat,
        candidates: Sequence[tuple[str, str | None, LonLat]],
        minutes: float,
        profile: WalkProfile,
    ) -> list[Reachable]:
        if not isfinite(minutes) or minutes < 0:
            raise ValueError("Time budget must be finite and nonnegative")
        start = self.snap(origin)
        if start is None or not candidates:
            return []
        connection = _connector_minutes(start, profile)
        distances = dijkstra(
            self._profiles[profile].matrix, directed=True, indices=start.node, limit=minutes
        )
        result = []
        for ref, name, location in candidates:
            end = self.snap(location)
            if end is None:
                continue
            cost = float(distances[end.node]) + connection + _connector_minutes(end, profile)
            if location == origin:
                cost = 0.0
            if cost <= minutes:
                result.append(Reachable(ref, name, cost, location))
        return sorted(result, key=lambda place: (place.minutes, place.ref))

    def _edges(self, path: Sequence[int], profile: WalkProfile) -> list[WalkEdge]:
        indices = self._profiles[profile].edge_indices
        return [self.graph.edge(indices[(start, end)]) for start, end in pairwise(path)]

    def _assemble(
        self,
        origin: LonLat,
        target: LonLat,
        profile: WalkProfile,
        *,
        start: Snap,
        end: Snap,
        there: Sequence[int],
        back: Sequence[int],
    ) -> Route:
        start_edge = _connector_edges(start) if origin != target else []
        end_edge = _connector_edges(end) if origin != target else []
        there_edges = start_edge + self._edges(there, profile) + end_edge
        back_edges = end_edge + self._edges(back, profile) + start_edge
        there_leg, back_leg = route_leg(there_edges, profile), route_leg(back_edges, profile)
        if there_leg is None or back_leg is None:
            raise ValueError("Indexed route contains an inaccessible edge")
        all_edges = there_edges + back_edges
        total_length = there_leg.length_m + back_leg.length_m
        uncertain_length = sum(edge.length_m for edge in all_edges if edge.uncertain)
        refs = tuple(dict.fromkeys(edge.osm_ref for edge in all_edges if edge.osm_ref))
        return Route(
            origin,
            target,
            profile,
            there_leg,
            back_leg,
            self._coordinates(origin, target, there),
            elevation_profile(there_edges, float(self.graph.nodes[start.node, 2])),
            uncertain_length / total_length if total_length else 0.0,
            refs,
        )

    def _coordinates(
        self, origin: LonLat, target: LonLat, path: Sequence[int]
    ) -> tuple[tuple[float, float], ...]:
        if origin == target:
            return ((origin.lon, origin.lat),)
        points = [(origin.lon, origin.lat)]
        points.extend(
            (float(self.graph.nodes[node, 0]), float(self.graph.nodes[node, 1])) for node in path
        )
        points.append((target.lon, target.lat))
        return tuple(
            point for index, point in enumerate(points) if index == 0 or point != points[index - 1]
        )


def _path(predecessors: NDArray[np.int32], start: int, end: int) -> tuple[int, ...]:
    nodes = [end]
    while nodes[-1] != start:
        predecessor = int(predecessors[nodes[-1]])
        if predecessor < 0 or len(nodes) > len(predecessors):
            raise ValueError("Invalid route predecessor chain")
        nodes.append(predecessor)
    return tuple(reversed(nodes))


def _connector_minutes(snap: Snap, profile: WalkProfile) -> float:
    return edge_minutes(snap.distance_m, 0, profile) if snap.distance_m else 0.0


def _connector_edges(snap: Snap) -> list[WalkEdge]:
    # Off-graph connectors have unknown surface/crossings and always lower confidence.
    return [WalkEdge(snap.distance_m, 0, uncertain=True)] if snap.distance_m else []
