from typing import ClassVar

from app.domain.knowledge.characteristic import MethodKind
from app.domain.knowledge.observation import (
    DEM_ATTRIBUTION,
    OSM_ATTRIBUTION,
    Evidence,
    EvidenceKind,
)
from app.domain.knowledge.scope import Scope
from app.service.geo.area import slopes_near
from app.service.recipes.executor import Environment, Finding, MethodCall, NoDataError
from app.service.recipes.models import AreaStatRecipe


class AreaStatExecutor:
    method: ClassVar[MethodKind] = MethodKind.AREA_STAT

    async def collect(self, call: MethodCall, env: Environment) -> list[Finding]:
        recipe = call.recipe_of(AreaStatRecipe)
        if recipe.metric != "steep_share":
            raise NoDataError("поддержана только доля крутых улиц")
        stat = slopes_near(env, call.hotel.location, recipe.radius_m)
        summary = f"{stat.share:.0%} участков с уклоном >8 % в {recipe.radius_m:g} м"
        await call.tracer.tool(
            "route.edges_within",
            summary=summary,
            args={"radius_m": recipe.radius_m},
            output={"share": stat.share, "estimated": stat.estimated},
        )
        evidence = Evidence(
            kind=EvidenceKind.MAP_LAYER,
            summary=summary,
            attribution=f"{OSM_ATTRIBUTION}; {DEM_ATTRIBUTION}",
            params={
                "share": stat.share,
                "threshold": recipe.threshold,
                "radiusM": recipe.radius_m,
                "estimated": stat.estimated,
                "segments": [
                    {"coordinates": s.coordinates, "slope": s.slope, "osmRef": s.osm_ref}
                    for s in stat.samples
                ],
            },
            osm_refs=tuple(dict.fromkeys(s.osm_ref for s in stat.samples if s.osm_ref)),
        )
        return [
            Finding(
                scope=Scope.everywhere(),
                value=stat.share >= recipe.threshold,
                confidence=0.6 if stat.estimated else 0.8,
                source_ref=f"method:area_stat@{call.characteristic.version}",
                method="доля участков с уклоном >8 %",
                evidence=(evidence,),
                caveats=("Оценка склонов по DEM, не измерение уклонов улиц",)
                if stat.estimated
                else (),
            )
        ]
