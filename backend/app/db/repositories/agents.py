from collections.abc import Sequence
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AgentRunRow, AgentStepRow
from app.domain.agents import AgentKind, AgentRun, Planner, RunStatus, Step, StepKind


def step_from_row(row: AgentStepRow) -> Step:
    return Step(
        seq=row.seq,
        at=row.at,
        kind=StepKind(row.kind),
        summary=row.summary,
        tool=row.tool,
        args=row.args,
        output=row.output,
        duration_ms=row.duration_ms,
    )


def run_from_row(row: AgentRunRow, steps: Sequence[AgentStepRow] = ()) -> AgentRun:
    return AgentRun(
        id=row.id,
        agent=AgentKind(row.agent),
        goal=row.goal,
        planner=Planner(row.planner),
        status=RunStatus(row.status),
        created_at=row.created_at,
        started_at=row.started_at,
        finished_at=row.finished_at,
        steps=tuple(step_from_row(s) for s in steps),
        usage=row.usage or None,
        subject=row.subject or None,
        error=row.error,
    )


class AgentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add_run(
        self,
        *,
        run_id: UUID,
        agent: AgentKind,
        goal: str,
        planner: Planner,
        subject: dict[str, Any],
        parent_run_id: UUID | None,
        now: datetime,
    ) -> None:
        self._session.add(
            AgentRunRow(
                id=run_id,
                agent=agent.value,
                goal=goal,
                planner=planner.value,
                status=RunStatus.QUEUED.value,
                subject=subject,
                parent_run_id=parent_run_id,
                created_at=now,
            )
        )

    async def run_row(self, run_id: UUID) -> AgentRunRow | None:
        return await self._session.get(AgentRunRow, run_id)

    async def run(self, run_id: UUID, *, after_seq: int = 0) -> AgentRun | None:
        row = await self._session.get(AgentRunRow, run_id, populate_existing=True)
        if row is None:
            return None
        steps = await self._session.scalars(
            select(AgentStepRow)
            .where(AgentStepRow.run_id == run_id, AgentStepRow.seq > after_seq)
            .order_by(AgentStepRow.seq)
        )
        return run_from_row(row, list(steps))

    async def runs(
        self, *, agent: AgentKind | None = None, hotel_id: UUID | None = None, limit: int = 50
    ) -> list[AgentRun]:
        stmt = select(AgentRunRow).order_by(AgentRunRow.created_at.desc()).limit(limit)
        if agent is not None:
            stmt = stmt.where(AgentRunRow.agent == agent.value)
        if hotel_id is not None:
            stmt = stmt.where(AgentRunRow.subject["hotelIds"].contains([str(hotel_id)]))
        return [run_from_row(r) for r in await self._session.scalars(stmt)]

    async def next_seq(self, run_id: UUID) -> int:
        current = await self._session.scalar(
            select(func.max(AgentStepRow.seq)).where(AgentStepRow.run_id == run_id)
        )
        return (current or 0) + 1

    def add_step(self, run_id: UUID, step: Step) -> None:
        self._session.add(
            AgentStepRow(
                run_id=run_id,
                seq=step.seq,
                at=step.at,
                kind=step.kind.value,
                tool=step.tool,
                summary=step.summary,
                args=step.args,
                output=step.output,
                duration_ms=step.duration_ms,
            )
        )
