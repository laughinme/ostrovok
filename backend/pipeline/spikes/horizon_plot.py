"""Diagnostic scientific plots; the images and map are local cache artifacts."""

from __future__ import annotations

from pathlib import Path
from textwrap import fill
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from horizon_geometry import BUILDING, SEA, SKY, TERRAIN, Horizon
from matplotlib.patches import Patch

COLORS = {BUILDING: "#a47353", TERRAIN: "#62836a", SEA: "#218dc1", SKY: "#e4f1fa"}
LABELS = {BUILDING: "Здания", TERRAIN: "Рельеф / DSM", SEA: "Море", SKY: "Небо"}


def plot_panorama(
    path: Path,
    hotel: dict[str, Any],
    facet: dict[str, Any],
    azimuths: np.ndarray,
    results: list[Horizon],
) -> None:
    fig, axes = plt.subplots(len(results), 1, figsize=(14, 9), sharex=True, squeeze=False)
    for axis, record, result in zip(axes[:, 0], facet["floors"], results, strict=True):
        bottom = min(-8, float(np.min(result.angle)) - 1)
        top = max(10, min(90, float(np.max(result.angle)) + 3))
        axis.set_facecolor(COLORS[SKY])
        axis.fill_between(azimuths, bottom, result.terrain, color=COLORS[TERRAIN], step="mid")
        axis.fill_between(
            azimuths,
            bottom,
            result.building,
            where=result.building > result.terrain,
            color=COLORS[BUILDING],
            step="mid",
        )
        axis.fill_between(
            azimuths,
            result.sea_low,
            result.sea_high,
            where=result.sea_visible,
            color=COLORS[SEA],
            step="mid",
        )
        for kind, color in COLORS.items():
            axis.scatter(
                azimuths[result.kind == kind], result.angle[result.kind == kind], s=6, c=color
            )
        axis.plot(azimuths, result.angle, c="#202b33", lw=0.7)
        axis.axhline(0, color="#60717a", ls=":", lw=0.8)
        axis.scatter(
            azimuths[result.sea_visible],
            np.full(result.sea_visible.sum(), bottom + 0.5),
            c=COLORS[SEA],
            marker="|",
            s=25,
        )
        axis.set_ylim(bottom, top)
        axis.set_xlim(azimuths[0], azimuths[-1])
        axis.set_ylabel("Угол, °")
        axis.set_title(
            f"Этаж {record['floor']} · море в {record['sea_fraction']:.1%} азимутов · "
            f"расчёт {record['evaluation_ms']:.1f} мс",
            loc="left",
            fontsize=11,
        )
        axis.grid(axis="x", alpha=0.2)
    axes[-1, 0].set_xlabel("Азимут, ° от севера (по часовой стрелке; возможен переход через 360°)")
    direction = "к морю" if facet["name"] == "sea" else "от моря"
    fig.suptitle(
        fill(f"{hotel['name']} · фасад {direction}, нормаль {facet['normal_deg']}°", 85) + "\n"
        f"±70°, лучи 1° · здания 2 км, рельеф 40 км · минимальный этаж с морем: "
        f"{facet['min_floor_with_sea'] or 'нет в здании'}",
        fontsize=13,
    )
    fig.legend(
        handles=[Patch(color=COLORS[k], label=LABELS[k]) for k in COLORS],
        loc="lower center",
        ncol=4,
        bbox_to_anchor=(0.5, 0.02),
    )
    fig.text(
        0.01,
        0.005,
        "OSM contributors (ODbL) · Copernicus DEM GLO-30 · номинальная модель, без MC",
        fontsize=8,
    )
    fig.tight_layout(rect=(0, 0.10, 1, 0.94))
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_context(
    path: Path,
    hotel: dict[str, Any],
    *,
    buildings: list[Any],
    polygon: Any,
    sea: Any,
    railways: Any,
    facades: list[Any],
) -> None:
    fig, axis = plt.subplots(figsize=(9, 9))
    axis.set_facecolor("#f5f3eb")
    for part in getattr(sea, "geoms", [sea]):
        axis.fill(*part.exterior.xy, color=COLORS[SEA], alpha=0.3)
    for building in buildings:
        for part in getattr(building.polygon, "geoms", [building.polygon]):
            if part.geom_type == "Polygon":
                axis.fill(*part.exterior.xy, color=COLORS[BUILDING], alpha=0.6)
    for part in [] if railways is None else getattr(railways, "geoms", [railways]):
        if not part.is_empty:
            axis.plot(*part.xy, color="#252525", lw=1.5)
    axis.plot(*polygon.exterior.xy, color="red", lw=2)
    for name, origin, normal in facades:
        color = "blue" if name == "sea" else "red"
        angle = np.radians(normal)
        axis.arrow(
            float(origin[0]),
            float(origin[1]),
            float(np.sin(angle) * 350),
            float(np.cos(angle) * 350),
            width=7,
            color=color,
        )
    axis.set_xlim(-2100, 2100)
    axis.set_ylim(-2100, 2100)
    axis.set_aspect("equal")
    axis.set_xlabel("Восток, м")
    axis.set_ylabel("Север, м")
    rail_label = "ж/д не загружена" if railways is None else "чёрный — ж/д"
    axis.set_title(
        f"{hotel['name']} · здания в 2 км\nСиний → к морю; красный → от моря; {rail_label}"
    )
    fig.text(
        0.01, 0.01, "© OpenStreetMap contributors (ODbL) · локальная AEQD проекция", fontsize=9
    )
    fig.savefig(path, dpi=120)
    plt.close(fig)
