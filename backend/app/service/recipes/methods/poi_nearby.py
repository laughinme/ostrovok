from typing import Any, ClassVar

from app.domain.catalog import MapFeature
from app.domain.geo.hours import parse_hours
from app.domain.knowledge.characteristic import MethodKind
from app.domain.knowledge.observation import OSM_ATTRIBUTION, Evidence, EvidenceKind
from app.domain.knowledge.scope import Scope
from app.domain.knowledge.sources import SourceKind
from app.service.recipes.executor import Environment, Finding, MethodCall
from app.service.recipes.methods.reach import DETOUR, WALK_M_PER_MIN, within_minutes
from app.service.recipes.models import PoiNearbyRecipe

# OSM is fairly complete for shops and cafes in Sochi, but an empty search is weak evidence.
FOUND_CONFIDENCE = 0.85
ABSENT_CONFIDENCE = 0.65
_WINDOWS = {"night": (23 * 60, 24 * 60), "morning": (7 * 60, 10 * 60)}


def _open_as_needed(feature: MapFeature, open_: str) -> bool | None:
    if open_ == "any":
        return True
    hours = parse_hours(feature.tags.get("opening_hours"))
    if open_ == "24_7":
        return hours.always_open
    start, end = _WINDOWS[open_]
    return hours.in_window(start, end)


def _matches_name(feature: MapFeature, parts: list[str]) -> bool:
    if not parts:
        return True
    name = (feature.name or feature.tags.get("name", "")).lower()
    return any(part.lower() in name for part in parts)


class PoiNearbyExecutor:
    """`poi_nearby`: `osm.find → route.reachable → hours.check → threshold` (09 §5.2)."""

    method: ClassVar[MethodKind] = MethodKind.POI_NEARBY

    async def collect(self, call: MethodCall, env: Environment) -> list[Finding]:
        recipe = call.recipe_of(PoiNearbyRecipe)
        hotel = call.hotel
        minutes = recipe.within_minutes or (recipe.within_m or 0) * DETOUR / WALK_M_PER_MIN
        radius = recipe.within_m or minutes * WALK_M_PER_MIN * 1.1
        found = [
            f
            for f in await env.reader.tagged(recipe.poi.tags, near=hotel.location, radius_m=radius)
            if _matches_name(f, recipe.poi.name_contains)
        ]
        await call.tracer.tool(
            "osm.find",
            summary=f"{len(found)} объектов OSM в {radius:.0f} м",
            args={"tags": recipe.poi.tags, "radiusM": round(radius)},
        )
        reached = within_minutes(env.router, hotel.location, found, minutes)
        estimated = any(est for _, _, est in reached)
        await call.tracer.tool(
            "route.reachable",
            summary=f"{len(reached)} в пределах {minutes:.0f} мин пешком"
            + (" (оценка по прямой)" if estimated else ""),
        )
        open_ok = [(f, m) for f, m, _ in reached if _open_as_needed(f, recipe.open) is not False]
        unknown_hours = sum(1 for f, _ in open_ok if _open_as_needed(f, recipe.open) is None)
        if recipe.open != "any":
            await call.tracer.tool(
                "hours.check",
                summary=f"подходят по часам: {len(open_ok) - unknown_hours}, "
                f"часы неизвестны: {unknown_hours}",
            )
        sure = len(open_ok) - unknown_hours
        value = len(open_ok) >= recipe.min_count
        confidence = (
            FOUND_CONFIDENCE if sure >= recipe.min_count else 0.6 if value else ABSENT_CONFIDENCE
        )
        if estimated:
            confidence -= 0.05
        nearest: list[dict[str, Any]] = [
            {"ref": f.osm_id, "name": f.name, "minutes": round(m, 1)} for f, m in open_ok[:5]
        ]
        return [
            Finding(
                scope=Scope.everywhere(),
                value=value,
                confidence=confidence,
                source=SourceKind.OPEN_DATA,
                source_ref=f"method:poi_nearby@{call.characteristic.version}",
                method="поиск объектов OSM и пешая доступность",
                evidence=(
                    Evidence(
                        kind=EvidenceKind.OSM_OBJECTS,
                        summary=_summary(nearest, minutes, value),
                        attribution=OSM_ATTRIBUTION,
                        params={"nearest": nearest, "withinMinutes": round(minutes)},
                        osm_refs=tuple(n["ref"] for n in nearest),
                    ),
                ),
                caveats=("Часы работы из OSM могут устареть",) if recipe.open != "any" else (),
            )
        ]


def _summary(nearest: list[dict[str, Any]], minutes: float, value: bool) -> str:
    if not value or not nearest:
        return f"в {minutes:.0f} минутах пешком подходящего места не нашли"
    first = nearest[0]
    name = first["name"] or "без названия"
    return f"ближайшее: «{name}», {first['minutes']} мин пешком; всего {len(nearest)}"
