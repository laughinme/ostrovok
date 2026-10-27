from typing import ClassVar

from app.domain.geo.types import WalkProfile
from app.domain.knowledge.characteristic import MethodKind
from app.domain.knowledge.observation import (
    DEM_ATTRIBUTION,
    OSM_ATTRIBUTION,
    Evidence,
    EvidenceKind,
)
from app.domain.knowledge.scope import Scope
from app.domain.knowledge.values import ValueType
from app.service.recipes.executor import Environment, Finding, MethodCall, NoDataError
from app.service.recipes.methods.reach import Walk, nearest_walk
from app.service.recipes.models import WalkToRecipe

_TARGET_KINDS = {"beach": ["beach"], "station": ["station"]}
_SEARCH_RADIUS_M = 3000


class WalkToExecutor:
    """`walk_to`: `route.snap → route.walk → route.profile`; there and back differ on a slope."""

    method: ClassVar[MethodKind] = MethodKind.WALK_TO

    async def collect(self, call: MethodCall, env: Environment) -> list[Finding]:
        recipe = call.recipe_of(WalkToRecipe)
        hotel = call.hotel
        if isinstance(recipe.target, str):
            targets = await env.reader.features_near(
                hotel.location, _SEARCH_RADIUS_M, kinds=_TARGET_KINDS.get(recipe.target, [])
            )
            label = {"beach": "пляж", "station": "станция", "center": "центр"}[recipe.target]
        else:
            targets = await env.reader.tagged(
                recipe.target.tags, near=hotel.location, radius_m=_SEARCH_RADIUS_M
            )
            label = "цель"
        await call.tracer.tool(
            "osm.find", summary=f"{len(targets)} вариантов «{label}» в 3 км", args={"target": label}
        )
        profile = WalkProfile(recipe.profile)
        walk = nearest_walk(env.router, hotel.location, targets, profile)
        if walk is None:
            raise NoDataError(f"{label}: пешком не дойти или нет данных")
        await call.tracer.tool(
            "route.walk",
            summary=_route_summary(walk, label),
            args={"profile": profile.value, "target": walk.feature.osm_id},
            output=_record(walk),
        )
        return [self._finding(call, recipe, walk, label)]

    def _finding(self, call: MethodCall, recipe: WalkToRecipe, walk: Walk, label: str) -> Finding:
        record = _record(walk)
        steps = walk.route.there.steps if walk.route else None
        if call.characteristic.value_type is ValueType.PROBABILITY:
            ok = (recipe.max_minutes is None or walk.minutes <= recipe.max_minutes) and (
                not recipe.no_steps or steps == 0
            )
            confidence = (
                0.6
                if walk.estimated
                else 0.85 - 0.3 * (walk.route.uncertain_share if walk.route else 0)
            )
            value: object = ok
        else:
            confidence = (
                0.6
                if walk.estimated
                else 0.9 - 0.3 * (walk.route.uncertain_share if walk.route else 0)
            )
            value = record
        caveats = (
            ("Без пешеходного графа: оценка по прямой ×1,35, рельеф не учтён",)
            if walk.estimated
            else ()
        )
        return Finding(
            scope=Scope.everywhere(),
            value=value,
            confidence=round(confidence, 3),
            source_ref=f"method:walk_to@{call.characteristic.version}",
            method="пеший маршрут по графу OSM с уклоном по рельефу (Тоблер)",
            evidence=(
                Evidence(
                    kind=EvidenceKind.ROUTE_PROFILE,
                    summary=_route_summary(walk, label),
                    attribution=f"{OSM_ATTRIBUTION}; {DEM_ATTRIBUTION}",
                    params={"target": walk.feature.osm_id, "profile": recipe.profile},
                    osm_refs=(walk.feature.osm_id,),
                ),
            ),
            caveats=caveats,
        )


def _record(walk: Walk) -> dict[str, object]:
    route = walk.route
    return {
        "minutes": round(walk.minutes, 1),
        "back_minutes": round(walk.back_minutes, 1),
        "climb_m": round(route.there.climb_m) if route else None,
        "back_climb_m": round(route.back.climb_m) if route else None,
        "steps": route.there.steps if route else None,
        "crossings": route.there.crossings if route else None,
        "length_m": round(route.there.length_m) if route else None,
        "target": walk.feature.name,
        "target_ref": walk.feature.osm_id,
        "estimated": walk.estimated,
    }


def _route_summary(walk: Walk, label: str) -> str:
    name = f"«{walk.feature.name}»" if walk.feature.name else label
    if walk.route is None:
        return f"{name}: ~{walk.minutes:.0f} мин по прямой (без графа)"
    there, back = walk.route.there, walk.route.back
    return (
        f"{name}: {there.minutes:.0f} мин туда, {back.minutes:.0f} обратно, "
        f"подъём {back.climb_m:.0f} м на обратном пути, ступеней {there.steps}"
    )
