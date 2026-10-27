import numpy as np

from app.infra.geo.walk_graph import WalkGraph


def make_graph(
    nodes: list[tuple[float, float, float]],
    edges: list[tuple[int, int]],
    lengths: list[float],
    *,
    steps: list[int] | None = None,
    crossings: list[int] | None = None,
    uncertain: list[bool] | None = None,
) -> WalkGraph:
    count = len(edges)
    return WalkGraph(
        nodes=np.array(nodes, dtype=np.float64),
        edges=np.array(edges, dtype=np.int64).reshape(-1, 2),
        length_m=np.array(lengths, dtype=np.float64),
        steps=np.array(steps if steps is not None else [0] * count, dtype=np.int64),
        crossings=np.array(crossings if crossings is not None else [0] * count, dtype=np.int64),
        uncertain=np.array(uncertain if uncertain is not None else [False] * count, dtype=np.bool_),
        osm_refs=tuple(f"way/{i}" for i in range(count)),
    )
