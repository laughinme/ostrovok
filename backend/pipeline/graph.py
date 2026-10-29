from pathlib import Path

import numpy as np

from app.infra.geo.terrain import NpyTerrain
from app.infra.geo.walk_graph import WalkGraph
from pipeline import pbf
from pipeline.graph_validation import verify_routes
from pipeline.osm import hotel_buffers
from pipeline.storage import REGION
from pipeline.walk_crossings import annotate_crossings, blocked_nodes
from pipeline.walk_topology import build_graph, extract_network


def save_graph(graph: WalkGraph, path: Path) -> None:
    temporary = path.with_name(path.stem + ".part.npz")
    np.savez_compressed(
        temporary,
        nodes=graph.nodes,
        edges=graph.edges.astype(np.int32),
        length_m=graph.length_m,
        steps=graph.steps.astype(np.int32),
        crossings=graph.crossings.astype(np.int32),
        uncertain=graph.uncertain,
        osm_refs=np.asarray(graph.osm_refs),
    )
    WalkGraph.from_file(temporary)
    temporary.replace(path)


def run() -> None:
    terrain = NpyTerrain(REGION)
    ways = pbf.regional_records("lines", where="highway IS NOT NULL OR railway IS NOT NULL")
    points = pbf.regional_records(
        "points",
        where="barrier IS NOT NULL OR highway = 'crossing' "
        "OR railway IN ('crossing', 'level_crossing')",
    )
    network = extract_network(ways, hotel_buffers(2000))
    print(f"Walking topology: {len(network.segments):,} original segments", flush=True)
    network = annotate_crossings(network, ways, points)
    graph = build_graph(network, terrain.elevation, blocked=blocked_nodes(points))
    verify_routes(graph)
    save_graph(graph, REGION / "walk_graph.npz")
    print(
        f"Walking graph: {len(graph.nodes):,} nodes, {len(graph.edges):,} directed arcs; "
        f"{np.count_nonzero(graph.steps):,} stair arcs, "
        f"{np.count_nonzero(graph.crossings):,} crossing arcs",
        flush=True,
    )
