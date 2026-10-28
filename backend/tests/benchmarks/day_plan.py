"""Render actual OSM day plans without a database, network or LLM.

uv run --group pipeline python -m tests.benchmarks.day_plan
"""

import asyncio
import json
import textwrap
from datetime import date
from pathlib import Path

import matplotlib
import numpy as np
from shapely import box, transform

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from app.api.schemas.day import DayPlanOut
from app.domain.geo.projection import LocalProjection
from app.service.geo.day import DayPlan, build_day
from tests.unit.geo.region_factory import DAY_HOTELS, RegionReader, regional_day_environment

OUTPUT = Path(".cache/day-ground2")
COLORS = ("#925420", "#147eae", "#3f8a46", "#d77c13", "#8a4f99", "#a13f4a")


def draw_map(axis, hotel, env, plan: DayPlan) -> None:
    projection = LocalProjection(hotel.location)
    reader: RegionReader = env.reader
    sea = transform(env.sea.context, projection.forward).intersection(box(-2600, -2600, 2600, 2600))
    for polygon in getattr(sea, "geoms", [sea]):
        if polygon.geom_type == "Polygon":
            axis.fill(*polygon.exterior.xy, color="#d2e8f1")
    for i, slot in enumerate(plan.slots):
        if slot.route is None:
            continue
        xy = projection.forward(np.array(slot.route.coordinates))
        axis.plot(xy[:, 0], xy[:, 1], color=COLORS[i], lw=2, alpha=0.8)
        axis.scatter(*xy[-1], color=COLORS[i], s=28)
        axis.annotate(str(i + 1), xy[-1], xytext=(5, 4), textcoords="offset points")
    axis.scatter(0, 0, color="black", marker="*", s=110, zorder=10)
    axis.set(
        xlim=(-2300, 2300), ylim=(-2300, 2300), xlabel="метры к востоку", ylabel="метры к северу"
    )
    axis.set_aspect("equal")
    axis.grid(alpha=0.2)
    axis.set_title(hotel.name)
    # OSM outlines show streets and railways independently of the calculated walk.
    circle = reader._circle(hotel.location, 2600)
    for index in reader.feature_tree.query(circle, predicate="intersects"):
        feature = reader.features[int(index)]
        if feature.kind not in {"road", "railway"}:
            continue
        geom = transform(feature.geometry, projection.forward)
        for line in getattr(geom, "geoms", [geom]):
            if line.geom_type == "LineString":
                axis.plot(*line.xy, color="#999999", lw=0.3, alpha=0.5, zorder=0)


def draw_profiles(axis, plan: DayPlan) -> None:
    for i, slot in enumerate(plan.slots):
        if slot.route is None:
            continue
        profile = np.asarray(slot.route.elevation_profile, dtype=float)
        axis.plot(profile[:, 0], profile[:, 1], color=COLORS[i], label=f"{i + 1}: {slot.at:%H:%M}")
    axis.set(xlabel="метры пути туда", ylabel="метры над уровнем моря", title="Профили высот (DSM)")
    axis.grid(alpha=0.2)
    axis.legend(fontsize=8)


def draw_schedule(axis, plan: DayPlan) -> None:
    axis.axis("off")
    y = 1.0
    for i, slot in enumerate(plan.slots):
        title = f"{i + 1}. {slot.at:%H:%M}  {slot.title}"
        if slot.route:
            walk = slot.route.walk
            leg = walk.route.there
            detail = (
                f"{slot.place or slot.osm_ref}\n{walk.minutes:.1f} / {walk.back_minutes:.1f} мин; "
                f"подъём {leg.climb_m:.0f} м, ступеней {leg.steps}, переходов {leg.crossings}"
            )
        else:
            detail = slot.unavailable_reason or slot.place or ""
        axis.text(0, y, title, color=COLORS[i], fontsize=10, weight="bold", va="top")
        axis.text(
            0,
            y - 0.04,
            "\n".join(textwrap.fill(line, 52) for line in detail.splitlines()),
            fontsize=9,
            va="top",
        )
        y -= 0.165


async def collect_plans(hotels, env) -> list[DayPlan]:
    return [await build_day(hotels[ref], env, date(2026, 11, 12)) for ref in DAY_HOTELS]


def main() -> None:
    hotels, env = regional_day_environment()
    plans = asyncio.run(collect_plans(hotels, env))
    OUTPUT.mkdir(exist_ok=True, parents=True)
    fig, axes = plt.subplots(3, 3, figsize=(19, 15), gridspec_kw={"width_ratios": [1, 1, 1.2]})
    for axes_row, ref, plan in zip(axes, DAY_HOTELS, plans, strict=True):
        draw_map(axes_row[0], hotels[ref], env, plan)
        draw_profiles(axes_row[1], plan)
        draw_schedule(axes_row[2], plan)
    fig.suptitle(
        "О!кно · Ваш день · 12 ноября 2026 · OSM / Copernicus / Astral\n"
        "Маршруты от отеля и обратно; часы OSM; модель, без проверки на местности",
        fontsize=15,
    )
    fig.tight_layout(rect=(0, 0, 1, 0.95))
    fig.savefig(OUTPUT / "plans.png", dpi=120)
    plt.close(fig)
    (OUTPUT / "plans.json").write_text(
        json.dumps(
            [DayPlanOut.from_plan(p).model_dump(mode="json") for p in plans],
            ensure_ascii=False,
            indent=2,
        )
    )
    print(OUTPUT / "plans.png")  # noqa: T201


if __name__ == "__main__":
    main()
