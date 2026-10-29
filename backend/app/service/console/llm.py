from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import func, select

from app.db.models import LlmCallRow
from app.db.uow import UnitOfWork


@dataclass(frozen=True, slots=True)
class LlmCall:
    id: UUID
    created_at: datetime
    task: str
    model: str
    status: str
    prompt: str
    output: Any
    tool_calls: list[Any]
    usage: dict[str, Any]
    cost_usd: float
    latency_ms: int
    error: str | None


@dataclass(frozen=True, slots=True)
class LlmSpend:
    task: str
    model: str
    calls: int
    cached: int
    failed: int
    cost_usd: float
    p50_ms: int | None


class LlmJournalView:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def recent(self, *, task: str | None = None, limit: int = 50) -> list[LlmCall]:
        query = select(LlmCallRow).order_by(LlmCallRow.created_at.desc()).limit(limit)
        if task:
            query = query.where(LlmCallRow.task == task)
        rows = await self._uow.session.scalars(query)
        return [
            LlmCall(
                r.id,
                r.created_at,
                r.task,
                r.model,
                r.status,
                r.prompt,
                r.output,
                list(r.tool_calls),
                dict(r.usage),
                r.cost_usd,
                r.latency_ms,
                r.error,
            )
            for r in rows
        ]

    async def spend(self, since: datetime) -> list[LlmSpend]:
        live = LlmCallRow.status == "ok"
        rows = await self._uow.session.execute(
            select(
                LlmCallRow.task,
                LlmCallRow.model,
                func.count(),
                func.count().filter(LlmCallRow.status == "cached"),
                func.count().filter(LlmCallRow.status.in_(("failed", "limit"))),
                func.coalesce(func.sum(LlmCallRow.cost_usd), 0.0),
                func.percentile_cont(0.5).within_group(LlmCallRow.latency_ms).filter(live),
            )
            .where(LlmCallRow.created_at >= since)
            .group_by(LlmCallRow.task, LlmCallRow.model)
            .order_by(LlmCallRow.task, LlmCallRow.model)
        )
        return [
            LlmSpend(task, model, n, cached, failed, float(cost), round(p50) if p50 else None)
            for task, model, n, cached, failed, cost, p50 in rows
        ]


def day_start(now: datetime) -> datetime:
    return now - timedelta(hours=now.hour, minutes=now.minute, seconds=now.second)
