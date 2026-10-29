from collections.abc import Awaitable, Callable, Sequence
from uuid import UUID

from geoalchemy2 import Geography
from sqlalchemy import cast, func, select

from app.db.database import Database
from app.db.models import Hotel, WorldChange
from app.db.repositories.catalog import hotel_geo
from app.domain.knowledge.influence import BUILDING_METHODS, INFLUENCE_RADIUS_M, affected_keys
from app.service.agents.researcher import Researcher
from app.service.agents.runtime import AgentRunner, Tracer
from app.service.ports import EventBus

CHANGES_CHANNEL = "changes"
Notify = Callable[[UUID, str, str], Awaitable[None]]


class Watcher:
    def __init__(
        self,
        db: Database,
        runner: AgentRunner,
        researcher: Researcher,
        events: EventBus,
        *,
        notify: Notify | None = None,
        invalidate: Callable[[], None] | None = None,
    ) -> None:
        self._invalidate = invalidate
        self._db = db
        self._runner = runner
        self._researcher = researcher
        self._events = events
        self._notify = notify

    async def react(self, run_id: UUID, change_id: UUID) -> None:
        async def body(tracer: Tracer) -> None:
            if self._invalidate is not None:
                self._invalidate()
            change, nearby = await self._affected(change_id)
            await tracer.tool(
                "world.affected",
                summary=f"«{change.title}»: в радиусе влияния {len(nearby)} отелей",
                args={"changeId": str(change_id), "radiusM": max(INFLUENCE_RADIUS_M.values())},
                output=[{"hotel": h.name, "distanceM": round(d)} for h, d in nearby],
            )
            characteristics = await self._researcher.characteristics()
            touched = []
            for hotel_row, distance in nearby:
                keys = affected_keys(characteristics, distance, BUILDING_METHODS)
                if not keys:
                    continue
                chosen = [c for c in characteristics if c.key in keys]
                await tracer.reason(
                    f"«{hotel_row.name}» в {distance:.0f} м: пересчитываю {', '.join(keys)}"
                )
                changed = await self._researcher.study(hotel_geo(hotel_row), chosen, tracer)
                touched.append(str(hotel_row.id))
                if changed and self._notify is not None:
                    await self._notify(
                        hotel_row.id,
                        "Рядом изменился мир",
                        f"{change.title}. Мы пересчитали вид и шум; изменилось фактов: {changed}",
                    )
            await self._record(change_id, touched, run_id)
            await self._events.publish(
                CHANGES_CHANNEL, {"type": "world.changed", "changeId": str(change_id)}
            )

        await self._runner.run(run_id, body)

    async def _affected(self, change_id: UUID) -> tuple[WorldChange, list[tuple[Hotel, float]]]:
        async with self._db.unit_of_work() as uow:
            change = await uow.session.get(WorldChange, change_id)
            if change is None or change.geom is None:
                raise LookupError(f"world change {change_id} has no geometry")
            geom = select(WorldChange.geom).where(WorldChange.id == change_id).scalar_subquery()
            distance = func.ST_Distance(cast(Hotel.footprint, Geography), cast(geom, Geography))
            rows = (
                await uow.session.execute(
                    select(Hotel, distance)
                    .where(distance <= max(INFLUENCE_RADIUS_M.values()))
                    .order_by(distance)
                )
            ).all()
            return change, [(h, float(d)) for h, d in rows]

    async def _record(self, change_id: UUID, hotels: Sequence[str], run_id: UUID) -> None:
        async with self._db.unit_of_work() as uow:
            change = await uow.session.get(WorldChange, change_id)
            if change is not None:
                change.affected_hotels = [UUID(h) for h in hotels]
                change.run_id = run_id
