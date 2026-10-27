from math import exp
from typing import ClassVar

from app.domain.geo.noise import facade_noise
from app.domain.geo.noise_sources import NoiseFeature, noise_sources
from app.domain.knowledge.characteristic import MethodKind
from app.domain.knowledge.observation import OSM_ATTRIBUTION, Evidence, EvidenceKind
from app.domain.knowledge.scope import Scope
from app.domain.knowledge.statements import FACADE_SHORT
from app.service.recipes.executor import Environment, Finding, MethodCall, NoDataError
from app.service.recipes.methods.local_scene import LocalFrame
from app.service.recipes.models import NoiseRecipe

_SOURCE_KINDS = {
    "road": ["road"],
    "railway": ["railway"],
    "bar_club": ["bar_club"],
    "construction": ["construction"],
    "aircraft": ["runway"],
}
_RADIUS_M = 600
_SCREEN_RADIUS_M = 250
# Adler runway at take-off, at 1 m in the same conditional units as roads (R5 has no number).
AIRCRAFT_POWER_DB = 95.0
_SPREAD_DB = 4.0  # how sharply "quiet" becomes "not quiet" around the threshold


class NoiseExecutor:
    """`noise`: `osm.sources → noise.facades`; a model on the map, not a measurement."""

    method: ClassVar[MethodKind] = MethodKind.NOISE

    async def collect(self, call: MethodCall, env: Environment) -> list[Finding]:
        recipe = call.recipe_of(NoiseRecipe)
        hotel = call.hotel
        frame = LocalFrame(hotel)
        kinds = [k for s in recipe.sources for k in _SOURCE_KINDS[s]]
        features = await env.reader.features_near(hotel.location, _RADIUS_M, kinds=kinds)
        local = [NoiseFeature(f.osm_id, frame.to_local(f.geometry), f.tags) for f in features]
        sources = noise_sources(local, aircraft_power_db=AIRCRAFT_POWER_DB)
        roads = sum(1 for f in features if f.kind == "road")
        await call.tracer.tool(
            "osm.sources",
            summary=f"{len(sources.sources)} источников шума в {_RADIUS_M} м, дорог {roads}",
            args={"period": recipe.period, "sources": recipe.sources},
        )
        buildings = await env.reader.buildings_near(hotel.location, _SCREEN_RADIUS_M)
        screens = [frame.footprint, *frame.many_to_local([b.geometry for b in buildings])]
        receivers = frame.receivers()
        if not receivers:
            raise NoDataError("у здания нет фасадов")
        findings = []
        lines = []
        for receiver in receivers:
            estimate = facade_noise(
                receiver.point,
                receiver.azimuth,
                sources.sources,
                recipe.period,
                buildings=screens,
                road_completeness=0.8 if roads else 0.5,
                source_completeness=max(0.5, sources.completeness),
            )
            index = estimate.index_db if estimate.index_db is not None else 20.0
            p_quiet = 1 / (1 + exp((index - recipe.quiet_below_db) / _SPREAD_DB))
            trust = 0.8 * max(0.5, sources.completeness)
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
        return findings
