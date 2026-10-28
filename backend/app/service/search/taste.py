from collections.abc import Mapping
from uuid import UUID

from sqlalchemy import select

from app.core.errors import DomainError
from app.db.models import TasteProfileRow, UserEventRow
from app.db.uow import UnitOfWork
from app.domain.search.intent import Intent
from app.domain.search.taste import (
    TasteEvent,
    TasteProfile,
    TasteWeight,
    apply_taste,
    infer_taste,
    taste_summary,
)
from app.service.knowledge.registry import Registry
from app.service.ports import Clock

MAX_WEIGHT = 3.0


class TasteService:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow, self._clock = uow, clock

    async def get(self, user_id: UUID) -> TasteProfile:
        row = await self._uow.session.get(TasteProfileRow, user_id)
        events = (
            await self._uow.session.scalars(
                select(UserEventRow)
                .where(
                    UserEventRow.user_id == user_id,
                )
                .order_by(UserEventRow.at, UserEventRow.id)
            )
        ).all()
        overrides = row.overrides if row else {}
        inferred = (
            {}
            if overrides.get("cleared")
            else infer_taste([TasteEvent(e.kind, e.payload) for e in events])
        )
        for key, weight in overrides.get("weights", {}).items():
            previous = inferred.get(key)
            inferred[key] = TasteWeight(
                key,
                float(weight),
                "Вы задали этот вес",
                previous.value if previous else key != "steep_streets",
            )
        weights = tuple(w for _, w in sorted(inferred.items()) if w.weight > 0)
        return TasteProfile(row.enabled if row else True, taste_summary(weights), weights)

    async def patch(
        self,
        user_id: UUID,
        *,
        enabled: bool | None = None,
        weights: Mapping[str, float] | None = None,
    ) -> TasteProfile:
        if weights:
            known = {c.key for c in await Registry(self._uow).all()}
            if any(k not in known or not 0 <= w <= MAX_WEIGHT for k, w in weights.items()):
                raise DomainError("Вес должен быть от 0 до 3 для известной характеристики")
        row = await self._uow.session.get(TasteProfileRow, user_id, with_for_update=True)
        if row is None:
            row = TasteProfileRow(user_id=user_id, enabled=True, overrides={})
            self._uow.session.add(row)
        if enabled is not None:
            row.enabled = enabled
        if weights is not None:
            row.overrides = row.overrides | {
                "weights": row.overrides.get("weights", {}) | dict(weights)
            }
        row.updated_at = self._clock.now()
        await self._uow.flush()
        return await self.get(user_id)

    async def reset(self, user_id: UUID) -> TasteProfile:
        await self.patch(user_id, enabled=False)
        row = await self._uow.session.get(TasteProfileRow, user_id)
        if row is not None:
            row.overrides = {"cleared": True}
        await self._uow.flush()
        return await self.get(user_id)

    async def apply(self, intent: Intent, user_id: UUID) -> Intent:
        titles = {c.key: (c.title, c.checkable) for c in await Registry(self._uow).all()}
        return apply_taste(intent, await self.get(user_id), titles)
