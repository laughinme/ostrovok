from collections import Counter
from datetime import timedelta
from uuid import UUID

from sqlalchemy import func, select

from app.db.models import DemandDaily, SearchRow
from app.db.uow import UnitOfWork
from app.service.ports import Clock
from app.service.search.search import top_hotels
from app.service.search.serialize import intent_from_json


class PartnerDemand:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow, self._clock = uow, clock

    async def weekly(self, district: str) -> dict[str, int]:
        today = self._clock.now().date()
        rows = await self._uow.session.execute(
            select(DemandDaily.characteristic, func.sum(DemandDaily.count))
            .where(
                DemandDaily.district.in_([district, "all"]),
                DemandDaily.day >= today - timedelta(days=6),
                DemandDaily.day <= today,
            )
            .group_by(DemandDaily.characteristic)
        )
        return {key: int(count) for key, count in rows}

    async def influence(self, hotel_id: UUID, district: str) -> dict[str, float]:
        rows = await self._uow.session.scalars(
            select(SearchRow).where(
                SearchRow.created_at >= self._clock.now() - timedelta(days=7),
                SearchRow.created_at <= self._clock.now(),
            )
        )
        total: Counter[str] = Counter()
        top: Counter[str] = Counter()
        for row in rows:
            intent = intent_from_json(row.intent)
            if intent.trip.area not in (None, district):
                continue
            keys = {c.characteristic for c in intent.chips if c.characteristic}
            total.update(keys)
            if str(hotel_id) in (top_hotels(row) or ()):
                top.update(keys)
        return {key: top[key] / count for key, count in total.items()}
