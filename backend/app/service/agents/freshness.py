from datetime import timedelta

from sqlalchemy import func, select

from app.db.database import Database
from app.db.models import DemandDaily, FactRow
from app.domain.jobs import JobKind, NewJob
from app.domain.knowledge.characteristic import MethodKind
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import Registry
from app.service.ports import Clock

AHEAD = timedelta(days=14)
BATCH = 30


class FreshnessScan:
    def __init__(self, db: Database, clock: Clock) -> None:
        self._db = db
        self._clock = clock

    async def run(self, limit: int = BATCH) -> int:
        now = self._clock.now()
        async with self._db.unit_of_work() as uow:
            demand = (
                select(DemandDaily.characteristic, func.sum(DemandDaily.count).label("wanted"))
                .where(DemandDaily.day >= (now - timedelta(days=7)).date())
                .group_by(DemandDaily.characteristic)
                .subquery()
            )
            rows = (
                await uow.session.execute(
                    select(FactRow.hotel_id, FactRow.characteristic)
                    .outerjoin(demand, demand.c.characteristic == FactRow.characteristic)
                    .where(FactRow.valid_until < now + AHEAD)
                    .group_by(FactRow.hotel_id, FactRow.characteristic, demand.c.wanted)
                    .order_by(
                        func.coalesce(demand.c.wanted, 0).desc(), func.min(FactRow.valid_until)
                    )
                    .limit(limit)
                )
            ).all()
            methods = {c.key: c.method for c in await Registry(uow).all()}
            queued = 0
            for hotel_id, key in rows:
                if methods.get(key) is MethodKind.ASK_HOTELIER:
                    await KnowledgeStore(uow, self._clock).reconcile_pair(
                        hotel_id, key, reason="истёк срок годности ответа отеля"
                    )
                    continue
                queued += await uow.jobs.enqueue(
                    NewJob(
                        JobKind.RESEARCH_COLLECT,
                        {"hotel_id": str(hotel_id), "keys": [key]},
                        dedupe_key=f"collect:{hotel_id}:{key}",
                    ),
                    now=now,
                )
            return queued
