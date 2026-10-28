"""The console's view of the registry: coverage, average confidence and freshness (09 §9)."""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import case, func, select

from app.db.models import FactRow, Hotel
from app.db.uow import UnitOfWork
from app.domain.knowledge.characteristic import Characteristic
from app.service.knowledge.registry import Registry


@dataclass(frozen=True, slots=True)
class RegistryLine:
    characteristic: Characteristic
    coverage: float
    avg_confidence: float | None
    stale_share: float
    conflicts: int


class RegistryStats:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def lines(self, now: datetime) -> list[RegistryLine]:
        items = await Registry(self._uow).all(include_drafts=True)
        hotels = await self._uow.session.scalar(select(func.count()).select_from(Hotel)) or 1
        rows = (
            await self._uow.session.execute(
                select(
                    FactRow.characteristic,
                    func.count(func.distinct(FactRow.hotel_id)),
                    func.avg(FactRow.confidence),
                    func.avg(case((FactRow.valid_until < now, 1.0), else_=0.0)),
                    func.count(func.distinct(FactRow.conflict_id)),
                ).group_by(FactRow.characteristic)
            )
        ).all()
        stats = {key: (n, avg, stale, conflicts) for key, n, avg, stale, conflicts in rows}
        return [
            RegistryLine(
                characteristic=c,
                coverage=round(stats.get(c.key, (0,))[0] / hotels, 3),
                avg_confidence=round(float(stats[c.key][1]), 3) if c.key in stats else None,
                stale_share=round(float(stats[c.key][2]), 3) if c.key in stats else 0.0,
                conflicts=int(stats[c.key][3]) if c.key in stats else 0,
            )
            for c in items
        ]
