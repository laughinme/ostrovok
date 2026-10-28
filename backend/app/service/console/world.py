"""«Построили дом» (09 §3.3): the operator changes the world, the Watcher reacts."""

from dataclasses import dataclass
from math import cos, radians
from uuid import UUID, uuid4

from geoalchemy2.shape import from_shape
from shapely import Polygon
from sqlalchemy import select

from app.core.errors import NotFoundError
from app.db.models import Building, WorldChange
from app.db.uow import UnitOfWork
from app.domain.agents import AgentKind, Planner
from app.domain.geo.facades import FLOOR_HEIGHT_M
from app.domain.jobs import JobKind
from app.service.agents.runtime import launch
from app.service.ports import Clock

_M_PER_DEG_LAT = 111_320.0


@dataclass(frozen=True, slots=True)
class NewBuilding:
    lon: float
    lat: float
    floors: int
    width_m: float = 30.0
    depth_m: float = 15.0
    title: str | None = None


def footprint(b: NewBuilding) -> Polygon:
    dx = b.width_m / 2 / (_M_PER_DEG_LAT * cos(radians(b.lat)))
    dy = b.depth_m / 2 / _M_PER_DEG_LAT
    return Polygon(
        [(b.lon - dx, b.lat - dy), (b.lon + dx, b.lat - dy), (b.lon + dx, b.lat + dy),
         (b.lon - dx, b.lat + dy)]
    )  # fmt: skip


class WorldEditor:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow = uow
        self._clock = clock

    async def add_building(self, building: NewBuilding) -> tuple[UUID, UUID]:
        shape = footprint(building)
        change_id = uuid4()
        title = building.title or f"Появилось здание: {building.floors} этажей"
        self._uow.session.add(
            WorldChange(
                id=change_id,
                kind="building_added",
                title=title,
                geom=from_shape(shape, srid=4326),
                payload={
                    "floors": building.floors,
                    "widthM": building.width_m,
                    "depthM": building.depth_m,
                },
            )
        )
        self._uow.session.add(
            Building(
                geom=from_shape(shape, srid=4326),
                height_m=building.floors * FLOOR_HEIGHT_M,
                levels=building.floors,
                height_source="osm_levels",
                kind="demo_world_change",
                added_by="world_change",
                world_change_id=change_id,
            )
        )
        await self._uow.flush()
        return change_id, await self._react(change_id, title)

    async def revert(self, change_id: UUID) -> UUID:
        change = await self._uow.session.get(WorldChange, change_id)
        if change is None:
            raise NotFoundError("World change not found")
        now = self._clock.now()
        change.reverted_at = now
        buildings = await self._uow.session.scalars(
            select(Building).where(Building.world_change_id == change_id)
        )
        for b in buildings:
            b.removed_at = now
        await self._uow.flush()
        return await self._react(change_id, f"Откат: {change.title}")

    async def _react(self, change_id: UUID, title: str) -> UUID:
        return await launch(
            self._uow,
            self._clock,
            agent=AgentKind.WATCHER,
            goal=f"Изменение мира — {title}: найти затронутые отели и пересчитать",
            planner=Planner.RULES,
            job=JobKind.WORLD_CHANGED,
            payload={"change_id": str(change_id)},
            subject={"changeId": str(change_id)},
        )

    async def feed(self, limit: int = 50) -> list[WorldChange]:
        rows = await self._uow.session.scalars(
            select(WorldChange).order_by(WorldChange.created_at.desc()).limit(limit)
        )
        return list(rows)
