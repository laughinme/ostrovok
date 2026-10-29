from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import numpy as np
from shapely import intersects, linestrings

from app.domain.geo.projection import FloatArray
from app.infra.geo.walk_graph import WalkGraph
from pipeline.geography import metric
from pipeline.walkways import directions, grade, step_counts, uncertain_way, walkable

type Coordinate = tuple[float, float]


@dataclass(frozen=True, slots=True)
class WalkSegment:
    ref: str
    start: Coordinate
    end: Coordinate
    layer: str
    length_m: float
    steps: int
    uncertain: bool
    directions: tuple[bool, bool]
    crossings: int = 0
    start_crossings: int = 0
    end_crossings: int = 0


@dataclass(frozen=True, slots=True)
class WalkNetwork:
    segments: tuple[WalkSegment, ...]
    endpoints: frozenset[Coordinate]


def extract_network(records: list[dict[str, Any]], area: Any) -> WalkNetwork:
    result = []
    endpoints: set[Coordinate] = set()
    for record in sorted(records, key=lambda row: row["osm_id"]):
        shape, tags = record["geometry"], record["tags"]
        if not walkable(tags) or shape.geom_type != "LineString":
            continue
        projected = metric(shape)
        if not projected.intersects(area):
            continue
        coordinates = np.asarray(shape.coords)[:, :2]
        xy = np.asarray(projected.coords)[:, :2]
        lengths = np.linalg.norm(np.diff(xy, axis=0), axis=1)
        if not lengths.sum():
            continue
        selected = intersects(linestrings(np.stack([xy[:-1], xy[1:]], axis=1)), area)
        counts = step_counts(tags, lengths)
        endpoints.update((tuple(coordinates[0]), tuple(coordinates[-1])))
        result.extend(
            WalkSegment(
                record["osm_id"],
                tuple(coordinates[index]),
                tuple(coordinates[index + 1]),
                grade(tags),
                float(lengths[index]),
                int(counts[index]),
                uncertain_way(tags),
                directions(tags),
            )
            for index in np.flatnonzero(selected & (lengths > 0))
        )
    return WalkNetwork(tuple(result), frozenset(endpoints))


def build_graph(
    network: WalkNetwork,
    elevation: Callable[[FloatArray], FloatArray],
    *,
    blocked: set[Coordinate] | None = None,
) -> WalkGraph:
    blocked = blocked or set()
    indices: dict[tuple[Coordinate, str], int] = {}
    edges, arcs, crossings = [], [], []
    for segment in network.segments:
        if segment.start in blocked or segment.end in blocked:
            continue
        pair = []
        for coordinate in (segment.start, segment.end):
            layer = "0" if coordinate in network.endpoints else segment.layer
            key = (coordinate, layer)
            pair.append(indices.setdefault(key, len(indices)))
        for forward, allowed in zip((True, False), segment.directions, strict=True):
            if not allowed:
                continue
            edges.append(pair if forward else pair[::-1])
            arcs.append(segment)
            crossings.append(
                segment.crossings + (segment.end_crossings if forward else segment.start_crossings)
            )
    if not edges:
        raise ValueError("No walkable edges in hotel buffers")
    coordinates = np.array([key[0] for key in indices], dtype=np.float64)
    heights = elevation(coordinates)
    if not np.all(np.isfinite(heights)):
        raise ValueError("Walk graph contains nodes outside valid DEM coverage")
    return WalkGraph(
        np.column_stack([coordinates, heights]),
        np.asarray(edges, dtype=np.int64),
        np.array([s.length_m for s in arcs], dtype=np.float64),
        np.array([s.steps for s in arcs], dtype=np.int64),
        np.asarray(crossings, dtype=np.int64),
        np.array([s.uncertain for s in arcs], dtype=np.bool_),
        tuple(s.ref for s in arcs),
    )
