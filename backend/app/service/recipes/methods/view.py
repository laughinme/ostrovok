"""Visibility findings by real facade and floor band, with sampled room positions."""

import asyncio
from math import ceil
from typing import ClassVar

import numpy as np

from app.domain.geo.montecarlo import VisibilityProbability, monte_carlo
from app.domain.geo.peaks import visible_peaks
from app.domain.knowledge.characteristic import MethodKind
from app.domain.knowledge.observation import (
    DEM_ATTRIBUTION,
    OSM_ATTRIBUTION,
    Evidence,
    EvidenceKind,
)
from app.domain.knowledge.scope import Facade, Scope
from app.service.geo.scenes import HotelScene, scene_cache
from app.service.recipes.executor import Environment, Finding, MethodCall, NoDataError
from app.service.recipes.models import ViewRecipe

VIEW_ATTRIBUTION = f"{OSM_ATTRIBUTION}; {DEM_ATTRIBUTION}"
VIEW_CAVEATS = (
    "Модель по DSM и OSM: без учёта погоды, остекления и деревьев, отсутствующих в данных",
    "Выбрана длиннейшая стена каждого фасада и три положения окна; МК не калиброван по фотографиям",
)


def floor_bands(floors: int) -> tuple[tuple[int, int], ...]:
    """At most four bands; findings describe a uniformly selected room floor in each band."""
    width = ceil(floors / 4)
    return tuple((low, min(low + width - 1, floors)) for low in range(1, floors + 1, width))


class ViewExecutor:
    method: ClassVar[MethodKind] = MethodKind.VIEW

    async def collect(self, call: MethodCall, env: Environment) -> list[Finding]:
        recipe = call.recipe_of(ViewRecipe)
        if recipe.target == "sea" and env.sea is None:
            raise NoDataError("нет маски моря")
        await call.tracer.tool("facades.of", summary=f"{len(call.hotel.facades)} реальных фасадов")
        scene = await scene_cache(env).get(call.hotel, env)
        await call.tracer.tool("buildings.near", summary=f"{len(scene.buildings)} зданий в 2 км")
        async with call.tracer.timed("geo.horizon") as step:
            for facade in call.hotel.facades:
                await asyncio.to_thread(scene.prepare, facade)
            step["summary"] = "Горизонт ±70°, шаг 1°, три окна на фасад, рельеф до 40 км"
        runs = 50 if env.extras.get("mc_runs") else 16
        async with call.tracer.timed("geo.montecarlo", {"runs": runs}) as step:
            findings = await asyncio.to_thread(_findings, call, scene, recipe, runs)
            step["summary"] = f"{runs} симуляций на каждую полосу этажей и фасад"
        return findings


def _findings(call: MethodCall, scene: HotelScene, recipe: ViewRecipe, runs: int) -> list[Finding]:
    findings = []
    for facade in call.hotel.facades:
        for low, high in floor_bands(call.hotel.floors):
            findings.append(_band_finding(call, scene, recipe, facade, (low, high), runs=runs))
    return findings


def _band_finding(
    call: MethodCall,
    scene: HotelScene,
    recipe: ViewRecipe,
    facade: Facade,
    band: tuple[int, int],
    *,
    runs: int,
) -> Finding:
    low, high = band
    rng = np.random.default_rng(low)
    eyes = np.asarray(
        scene.base_m + (rng.integers(low, high + 1, runs) - 0.5) * 3, dtype=np.float64
    )
    windows = scene.prepare(facade)
    result = monte_carlo(
        windows,
        eyes,
        runs=runs,
        min_fraction=max(recipe.min_share, 1e-9),
        target=recipe.target,
    )
    positive = result.probability >= 0.5
    return Finding(
        scope=Scope(facades=frozenset({facade}), floor_from=low, floor_to=high),
        value=positive,
        confidence=result.probability if positive else 1 - result.probability,
        source_ref=f"method:view@{call.characteristic.version}",
        method="Монте-Карло по горизонту, высотам зданий и положению окна",
        evidence=(_evidence(scene, recipe, facade, band, result),),
        caveats=(*VIEW_CAVEATS, "Вероятность для случайного окна и этажа внутри полосы"),
    )


def _evidence(
    scene: HotelScene,
    recipe: ViewRecipe,
    facade: Facade,
    band: tuple[int, int],
    result: VisibilityProbability,
) -> Evidence:
    low, high = band
    runs = len(result.fractions)
    yes = int(np.count_nonzero(result.fractions >= max(recipe.min_share, 1e-9)))
    peaks = (
        visible_peaks(scene.prepare(facade)[1], scene.eye(low), scene.peaks)
        if recipe.target == "mountains"
        else ()
    )
    label = "море" if recipe.target == "sea" else "горный силуэт"
    return Evidence(
        kind=EvidenceKind.HORIZON_PANORAMA,
        summary=f"{label} видно в {yes} из {runs} симуляций · этажи {low}–{high}",
        attribution=VIEW_ATTRIBUTION,
        params={
            "facade": facade.value,
            "floor": low,
            "floorTo": high,
            "target": recipe.target,
            "runs": runs,
            "yes": yes,
            "share": round(float(np.mean(result.fractions)), 4),
            "minShare": recipe.min_share,
            "floorSampling": "uniform",
            "peaks": [{"name": p.name, "ref": p.ref} for p in peaks],
        },
        osm_refs=tuple(p.ref for p in peaks),
    )
