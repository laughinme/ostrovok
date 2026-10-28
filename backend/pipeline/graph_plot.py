"""Draw the three routing smoke checks without map tiles or network access."""

import json
from typing import Any

import numpy as np
from matplotlib.backends.backend_agg import FigureCanvasAgg
from matplotlib.collections import LineCollection
from matplotlib.figure import Figure
from shapely import from_wkb

from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import LonLat
from app.infra.geo.walk_graph import WalkGraph
from pipeline.graph_validation import DIAGNOSTICS
from pipeline.storage import REGION, read_csv


def draw_map(
    axis: Any, check: dict[str, Any], graph: WalkGraph, features: list[dict[str, str]]
) -> None:
    coordinates = np.asarray(check["route"]["coordinates"])
    projection = LocalProjection(
        LonLat(float(coordinates[:, 0].mean()), float(coordinates[:, 1].mean()))
    )
    route = projection.forward(coordinates)
    nodes = projection.forward(graph.nodes[:, :2])
    bounds = route.min(axis=0) - 150, route.max(axis=0) + 150
    edges = nodes[graph.edges]
    selected = np.all(edges.max(axis=1) >= bounds[0], axis=1) & np.all(
        edges.min(axis=1) <= bounds[1], axis=1
    )
    axis.add_collection(LineCollection(edges[selected], colors="#b6bdc5", linewidths=0.6))
    for feature in features:
        if feature["kind"] == "railway" or feature["osm_id"] == check["beach"]:
            shape = from_wkb(feature["wkb"])
            for line in _lines(shape):
                xy = projection.forward(np.asarray(line.coords)[:, :2])
                color = "#00a5b5" if feature["kind"] == "beach" else "#222222"
                axis.plot(xy[:, 0], xy[:, 1], color=color, linewidth=1, linestyle="--")
    axis.plot(route[:, 0], route[:, 1], color="#8049d9", linewidth=2.5)
    axis.scatter(route[[0, -1], 0], route[[0, -1], 1], c=["#e74c3c", "#00a5b5"], s=40, zorder=5)
    axis.set(
        xlim=(bounds[0][0], bounds[1][0]),
        ylim=(bounds[0][1], bounds[1][1]),
        xlabel="Восток, м",
        ylabel="Север, м",
        title=check["name"],
    )
    axis.set_aspect("equal")
    axis.grid(alpha=0.2)


def _lines(shape: Any) -> list[Any]:
    if shape.geom_type == "LineString":
        return [shape]
    if shape.geom_type == "Polygon":
        return [shape.exterior, *shape.interiors]
    return [line for part in getattr(shape, "geoms", []) for line in _lines(part)]


def run() -> None:
    graph = WalkGraph.from_file(REGION / "walk_graph.npz")
    report = json.loads((DIAGNOSTICS / "walk-validation.json").read_text())
    features = read_csv("osm_features.csv.gz")
    figure = Figure(figsize=(15, 9), layout="constrained")
    FigureCanvasAgg(figure)
    axes = figure.subplots(2, 3)
    for column, check in enumerate(report["checks"]):
        draw_map(axes[0, column], check, graph, features)
        route = check["route"]
        profile = np.asarray(route["elevation_profile"])
        axes[1, column].plot(profile[:, 0], profile[:, 1], color="#8049d9")
        axes[1, column].set(
            xlabel="Расстояние, м",
            ylabel="Высота DSM, м",
            title=f"{route['there']['minutes']:.1f} мин туда / "
            f"{route['back']['minutes']:.1f} мин обратно\n"
            f"{route['there']['steps']} ступеней; "
            f"{route['there']['crossings']} переходов",
        )
        axes[1, column].grid(alpha=0.2)
    figure.suptitle(
        "Проверка графа OSM + Copernicus: красный — отель, голубой — пляж; "
        "чёрный пунктир — ж/д\nПодходы к графу приблизительные; "
        "входы на пляж и доступность на местности не подтверждены",
        fontsize=12,
    )
    target = DIAGNOSTICS / "walk-validation.png"
    figure.savefig(target, dpi=140)
    print(target)


if __name__ == "__main__":
    run()
