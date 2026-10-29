import numpy as np
from shapely import LineString, Point

from app.domain.geo.projection import LocalProjection
from app.domain.geo.slopes import SlopeSample, SlopeStat, slope_stat
from app.domain.geo.types import LonLat
from app.infra.geo.walk_graph import WalkGraph


class GraphAreaSlopes:
    def __init__(self, graph: WalkGraph) -> None:
        self.graph = graph

    def within(self, origin: LonLat, radius_m: float) -> SlopeStat | None:
        projection = LocalProjection(origin)
        xy = projection.forward(self.graph.nodes[:, :2])
        starts, ends = xy[self.graph.edges[:, 0]], xy[self.graph.edges[:, 1]]
        lo, hi = np.minimum(starts, ends), np.maximum(starts, ends)
        mask = np.all((lo <= radius_m) & (hi >= -radius_m), axis=1)
        circle = Point(0, 0).buffer(radius_m)
        seen: set[tuple[int, int, str]] = set()
        samples = []
        for index in np.flatnonzero(mask):
            start, end = (int(n) for n in self.graph.edges[index])
            ref = self.graph.osm_refs[index]
            key = (min(start, end), max(start, end), ref)
            line = LineString([starts[index], ends[index]])
            if key in seen or not line.intersects(circle):
                continue
            seen.add(key)
            slope = float(
                (self.graph.nodes[end, 2] - self.graph.nodes[start, 2]) / self.graph.length_m[index]
            )
            coordinates = tuple(
                (float(p[0]), float(p[1])) for p in self.graph.nodes[[start, end], :2]
            )
            samples.append(SlopeSample(coordinates, slope, ref))
        return slope_stat(tuple(samples)) if samples else None
