from pathlib import Path
from tempfile import TemporaryDirectory
from time import perf_counter

import numpy as np

from app.domain.geo.types import LonLat, WalkProfile
from app.infra.geo.router import ScipyRouter


def write_grid(path: Path, side: int = 317) -> tuple[LonLat, LonLat, int, int]:
    indices = np.arange(side * side).reshape(side, side)
    north, east = np.indices((side, side))
    nodes = np.column_stack(
        (
            39.7 + east.ravel() * 0.000037,
            43.6 + north.ravel() * 0.000027,
            np.zeros(side * side),
        )
    )
    right = np.column_stack((indices[:, :-1].ravel(), indices[:, 1:].ravel()))
    down = np.column_stack((indices[:-1].ravel(), indices[1:].ravel()))
    forward = np.concatenate((right, down))
    edges = np.concatenate((forward, forward[:, ::-1]))
    count = len(edges)
    np.savez_compressed(
        path,
        nodes=nodes,
        edges=edges,
        length_m=np.full(count, 3.0),
        steps=np.zeros(count, dtype=np.int64),
        crossings=np.zeros(count, dtype=np.int64),
        uncertain=np.zeros(count, dtype=np.bool_),
        osm_refs=np.full(count, "way/1"),
    )
    row, col = side // 2, side // 2
    start, end = indices[row, col], indices[row, col + 42]
    origin = LonLat(float(nodes[start, 0]), float(nodes[start, 1]))
    target = LonLat(float(nodes[end, 0]), float(nodes[end, 1]))
    return origin, target, len(nodes), count


def benchmark() -> dict[str, float | int]:
    with TemporaryDirectory(prefix="ground-graph-") as temporary:
        path = Path(temporary) / "walk_graph.npz"
        origin, target, nodes, arcs = write_grid(path)
        started = perf_counter()
        router = ScipyRouter.from_file(path)
        startup = perf_counter() - started
        durations = []
        for _ in range(25):
            started = perf_counter()
            route = router.route(origin, target, WalkProfile.WALK)
            durations.append((perf_counter() - started) * 1000)
            if route is None or route.there.length_m != 126:
                raise RuntimeError("Benchmark route is incorrect")
    return {
        "nodes": nodes,
        "arcs": arcs,
        "startup_s": round(startup, 3),
        "route_ms_p50": round(float(np.median(durations)), 3),
        "route_ms_p95": round(float(np.percentile(durations, 95)), 3),
        "route_ms_max": round(max(durations), 3),
    }


if __name__ == "__main__":
    print(benchmark())  # noqa: T201
