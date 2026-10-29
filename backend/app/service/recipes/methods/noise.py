from dataclasses import replace
from math import exp
from typing import ClassVar

from app.domain.knowledge.characteristic import Level, MethodKind
from app.domain.knowledge.observation import OSM_ATTRIBUTION, Evidence, EvidenceKind
from app.domain.knowledge.scope import Scope
from app.domain.knowledge.statements import FACADE_SHORT
from app.service.geo.noise import RADIUS_M, hotel_noise
from app.service.recipes.executor import Environment, Finding, MethodCall
from app.service.recipes.models import NoiseRecipe

_SPREAD_DB = 4.0


class NoiseExecutor:
    method: ClassVar[MethodKind] = MethodKind.NOISE

    async def collect(self, call: MethodCall, env: Environment) -> list[Finding]:
        recipe = call.recipe_of(NoiseRecipe)
        scene = await hotel_noise(call.hotel, env, recipe.sources)
        await call.tracer.tool(
            "osm.sources",
            summary=f"{scene.source_count} источников шума в {RADIUS_M} м; "
            f"дорог {scene.road_count}",
            args={"period": recipe.period, "sources": recipe.sources},
        )
        findings = []
        lines = []
        for receiver in scene.facades:
            estimate = receiver.day if recipe.period == "day" else receiver.night
            index = estimate.index_db if estimate.index_db is not None else 20.0
            p_quiet = 1 / (1 + exp((index - recipe.quiet_below_db) / _SPREAD_DB))
            trust = 0.8 * max(0.5, scene.completeness)
            p = 0.5 + (p_quiet - 0.5) * trust
            quiet = p >= 0.5
            lines.append(f"{FACADE_SHORT[receiver.facade]} {index:.0f} дБ")
            top = [c.osm_ref for c in estimate.sources[:3]]
            findings.append(
                Finding(
                    scope=Scope(facades=frozenset({receiver.facade})),
                    value=quiet,
                    confidence=round(p if quiet else 1 - p, 3),
                    source_ref=f"method:noise@{call.characteristic.version}",
                    method="модель шума по OSM: дороги, ж/д, бары, стройки; экранирование домами",
                    evidence=(
                        Evidence(
                            kind=EvidenceKind.NOISE_FACADES,
                            summary=f"индекс {index:.0f} дБ ({recipe.period}), порог "
                            f"{recipe.quiet_below_db:.0f}",
                            attribution=OSM_ATTRIBUTION,
                            params={
                                "facade": receiver.facade.value,
                                "period": recipe.period,
                                "indexDb": round(index, 1),
                                "sources": [
                                    {
                                        "ref": c.osm_ref,
                                        "kind": c.kind,
                                        "db": round(c.index_db, 1),
                                        "distanceM": round(c.distance_m),
                                    }
                                    for c in estimate.sources
                                ],
                            },
                            osm_refs=tuple(top),
                        ),
                    ),
                    caveats=("Модель шума по карте, а не замер",),
                )
            )
        await call.tracer.tool(
            "noise.facades", summary="; ".join(lines), args={"period": recipe.period}
        )
        if call.characteristic.level is Level.HOTEL:
            loudest = min(findings, key=lambda f: f.confidence if f.value else 1 - f.confidence)
            return [replace(loudest, scope=Scope.everywhere())]
        return findings
