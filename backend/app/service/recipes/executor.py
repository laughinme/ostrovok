from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any, ClassVar, Protocol

from app.db.database import Database
from app.domain.catalog import BuildingShape, HotelGeo, MapFeature
from app.domain.geo.types import LonLat
from app.domain.knowledge.characteristic import Characteristic, MethodKind
from app.domain.knowledge.fact import Fact
from app.domain.knowledge.observation import Evidence
from app.domain.knowledge.scope import Scope
from app.domain.knowledge.sources import SourceKind
from app.service.agents.runtime import Tracer
from app.service.ports import Clock, Router, TerrainModel
from app.service.recipes.models import Recipe, TagFilter


@dataclass(frozen=True, slots=True)
class Finding:
    scope: Scope
    value: Any
    confidence: float
    source_ref: str
    method: str
    source: SourceKind = SourceKind.COMPUTED
    evidence: tuple[Evidence, ...] = ()
    caveats: tuple[str, ...] = ()
    is_demo: bool = False


class NoDataError(Exception):
    pass


class GeoReader:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def feature(self, osm_id: str) -> MapFeature | None:
        async with self._db.unit_of_work() as uow:
            return await uow.catalog.feature(osm_id)

    async def features_near(
        self, point: LonLat, radius_m: float, *, kinds: Sequence[str] | None = None
    ) -> list[MapFeature]:
        async with self._db.unit_of_work() as uow:
            return await uow.catalog.features_near(point, radius_m, kinds=kinds)

    async def tagged(
        self, tags: dict[str, list[str]], *, near: LonLat, radius_m: float
    ) -> list[MapFeature]:
        async with self._db.unit_of_work() as uow:
            return await uow.catalog.features_tagged(tags, near=near, radius_m=radius_m)

    async def matching(
        self, tag_filter: TagFilter, *, near: LonLat | None = None, radius_m: float = 0
    ) -> list[MapFeature]:
        async with self._db.unit_of_work() as uow:
            found = await uow.catalog.features_with_keys(
                tag_filter.keys, near=near, radius_m=radius_m
            )
        return [f for f in found if tag_filter.matches(dict(f.tags))]

    async def buildings_near(self, point: LonLat, radius_m: float) -> list[BuildingShape]:
        async with self._db.unit_of_work() as uow:
            return await uow.catalog.buildings_near(point, radius_m)

    async def facts_of(self, hotel: HotelGeo, key: str) -> list[Fact]:
        async with self._db.unit_of_work() as uow:
            return await uow.knowledge.facts([hotel.id], characteristic=key)

    async def facts_values(self, hotel: HotelGeo, key: str) -> list[tuple[Any, float]]:
        return [(f.value, f.confidence) for f in await self.facts_of(hotel, key)]


@dataclass(slots=True)
class Environment:
    reader: GeoReader
    clock: Clock
    router: Router | None = None
    terrain: TerrainModel | None = None
    climate: Any = None
    sea: Any = None
    extras: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class MethodCall:
    hotel: HotelGeo
    characteristic: Characteristic
    recipe: Recipe
    tracer: Tracer

    def recipe_of[R](self, kind: type[R]) -> R:
        if not isinstance(self.recipe, kind):
            raise TypeError(f"{self.characteristic.key}: expected {kind.__name__}")
        return self.recipe


class MethodExecutor(Protocol):
    method: ClassVar[MethodKind]

    async def collect(self, call: MethodCall, env: Environment) -> list[Finding]: ...


def executors_by_method(executors: Sequence[MethodExecutor]) -> Mapping[MethodKind, MethodExecutor]:
    return {e.method: e for e in executors}
