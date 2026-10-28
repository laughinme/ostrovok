"""Monthly sun-event findings from the same uncertain horizons as the window panorama."""

import asyncio
from calendar import monthrange
from datetime import date
from typing import ClassVar

import numpy as np

from app.domain.geo.horizon import evaluate_horizon
from app.domain.geo.montecarlo import sampled_horizons
from app.domain.geo.solar_visibility import event_visible, solar_intersection
from app.domain.geo.sun import SunPosition, sun_events
from app.domain.knowledge.characteristic import MethodKind
from app.domain.knowledge.observation import Evidence, EvidenceKind
from app.domain.knowledge.scope import Facade, Scope
from app.service.geo.scenes import HotelScene, scene_cache
from app.service.recipes.executor import Environment, Finding, MethodCall, NoDataError
from app.service.recipes.methods.view import VIEW_ATTRIBUTION, VIEW_CAVEATS, floor_bands
from app.service.recipes.models import SunEventRecipe


class SunEventExecutor:
    method: ClassVar[MethodKind] = MethodKind.SUN_EVENT

    async def collect(self, call: MethodCall, env: Environment) -> list[Finding]:
        recipe = call.recipe_of(SunEventRecipe)
        if recipe.over == "sea" and env.sea is None:
            raise NoDataError("нет маски моря")
        scene = await scene_cache(env).get(call.hotel, env)
        async with call.tracer.timed("geo.horizon") as step:
            for facade in call.hotel.facades:
                await asyncio.to_thread(scene.prepare, facade)
            step["summary"] = "Горизонт для реальных фасадов и полос этажей"
        runs = 50 if env.extras.get("mc_runs") else 16
        year = env.clock.now().year
        async with call.tracer.timed("sun.path", {"year": year}) as step:
            events = await asyncio.to_thread(_monthly_events, scene, recipe, year, runs)
            step["summary"] = "Путь солнца по дням каждого месяца (МСК)"
        async with call.tracer.timed("visibility", {"runs": runs}) as step:
            findings = await asyncio.to_thread(_findings, call, scene, recipe, events)
            step["summary"] = f"{len(findings)} областей фасад × этажи × месяц"
        return findings


def _monthly_events(
    scene: HotelScene,
    recipe: SunEventRecipe,
    year: int,
    runs: int,
) -> dict[int, tuple[SunPosition, ...]]:
    return {
        month: tuple(
            getattr(sun_events(scene.hotel.location, date(year, month, int(day))), recipe.event)
            for day in np.linspace(1, monthrange(year, month)[1], runs, dtype=int)
        )
        for month in range(1, 13)
    }


def _findings(
    call: MethodCall,
    scene: HotelScene,
    recipe: SunEventRecipe,
    events: dict[int, tuple[SunPosition, ...]],
) -> list[Finding]:
    findings = []
    runs = len(events[1])
    for facade in call.hotel.facades:
        windows = scene.prepare(facade)
        for low, high in floor_bands(call.hotel.floors):
            rng = np.random.default_rng(low)
            eyes = np.asarray(
                scene.base_m + (rng.integers(low, high + 1, runs) - 0.5) * 3, dtype=np.float64
            )
            samples = sampled_horizons(windows, eyes, runs=runs)
            for month, positions in events.items():
                yes = sum(
                    event_visible(
                        positions[int(index)],
                        sample.scene,
                        sample.horizon.row(row),
                        over_sea=recipe.over == "sea",
                    )
                    for sample in samples
                    for row, index in enumerate(sample.indices)
                )
                evidence = _evidence(scene, recipe, facade, low, positions, yes=yes)
                p = yes / runs
                findings.append(
                    Finding(
                        scope=Scope(
                            facades=frozenset({facade}),
                            floor_from=low,
                            floor_to=high,
                            months=frozenset({month}),
                        ),
                        value=p >= 0.5,
                        confidence=p if p >= 0.5 else 1 - p,
                        source_ref=f"method:sun_event@{call.characteristic.version}",
                        method="Астрономия и Монте-Карло по горизонту, окнам и дням месяца",
                        evidence=(evidence,),
                        caveats=VIEW_CAVEATS,
                    )
                )
    return findings


def _evidence(
    scene: HotelScene,
    recipe: SunEventRecipe,
    facade: Facade,
    floor: int,
    positions: tuple[SunPosition, ...],
    *,
    yes: int,
) -> Evidence:
    day = positions[len(positions) // 2].at.date()
    window = scene.prepare(facade)[1]
    crossing = solar_intersection(
        scene.hotel.location,
        day,
        window,
        evaluate_horizon(window, scene.eye(floor)),
        event=recipe.event,
        eye_m=scene.eye(floor),
    )
    event = getattr(sun_events(scene.hotel.location, day), recipe.event)
    label = "Закат" if recipe.event == "sunset" else "Рассвет"
    return Evidence(
        kind=EvidenceKind.HORIZON_PANORAMA,
        summary=f"{label} виден в {yes} из {len(positions)} симуляций",
        attribution=VIEW_ATTRIBUTION,
        params={
            "facade": facade.value,
            "floor": floor,
            "month": day.month,
            "date": day.isoformat(),
            "event": recipe.event,
            "over": recipe.over,
            "time": crossing.position.at.strftime("%H:%M") if crossing else None,
            "astronomicalTime": event.at.strftime("%H:%M"),
            "behind": crossing.behind if crossing else "вне поля зрения/закрыт",
            "runs": len(positions),
            "yes": yes,
            "timezone": "Europe/Moscow",
        },
    )
