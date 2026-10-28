from uuid import UUID

from sqlalchemy import select

from app.core.errors import NotFoundError
from app.db.models import ConflictRow
from app.db.uow import UnitOfWork
from app.service.ports import Clock


class ConflictDesk:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow = uow
        self._clock = clock

    async def list(self, *, open_only: bool = False, limit: int = 100) -> list[ConflictRow]:
        stmt = select(ConflictRow).order_by(ConflictRow.created_at.desc()).limit(limit)
        if open_only:
            stmt = stmt.where(ConflictRow.resolved_at.is_(None))
        return list(await self._uow.session.scalars(stmt))

    async def resolve(self, conflict_id: UUID, resolution: str) -> ConflictRow:
        row = await self._uow.session.get(ConflictRow, conflict_id)
        if row is None:
            raise NotFoundError("Conflict not found")
        row.status = "resolved"
        row.resolution = f"Решение оператора: {resolution}"
        row.resolved_at = self._clock.now()
        await self._uow.flush()
        return row
