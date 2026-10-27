"""
Agent runtime (09 §4.5): a run and its job are created in one transaction; the worker executes
the agent; every step is its own short transaction and wakes SSE listeners through the bus.
The database is the source of truth, the bus only says "look again".
"""

import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any
from uuid import UUID, uuid4

from pydantic_core import to_jsonable_python

from app.db.database import Database
from app.db.uow import UnitOfWork
from app.domain.agents import AgentKind, Planner, RunStatus, Step, StepKind
from app.domain.jobs import JobKind, NewJob
from app.service.ports import Clock, EventBus, Usage

logger = logging.getLogger(__name__)

_TEXT_MAX = 500


def run_channel(run_id: UUID) -> str:
    return f"run:{run_id}"


def step_event(run_id: UUID, step: Step) -> dict[str, Any]:
    return {
        "type": "run.step",
        "runId": str(run_id),
        "step": {
            "seq": step.seq,
            "at": step.at.isoformat(),
            "kind": step.kind.value,
            "tool": step.tool,
            "summary": step.summary,
            "args": step.args,
            "output": step.output,
            "durationMs": step.duration_ms,
        },
    }


class Tracer:
    """Writes the trace of one run. Implements `StepSink` for tools."""

    def __init__(self, db: Database, events: EventBus, clock: Clock, run_id: UUID) -> None:
        self._db = db
        self._events = events
        self._clock = clock
        self.run_id = run_id
        self._seq: int | None = None
        self.usage = Usage()

    async def reason(self, summary: str) -> None:
        await self._write(StepKind.REASON, summary)

    async def result(self, summary: str, output: Any = None) -> None:
        await self._write(StepKind.RESULT, summary, output=output)

    async def decide(self, summary: str, output: Any = None) -> None:
        await self._write(StepKind.DECISION, summary, output=output)

    async def error(self, summary: str) -> None:
        await self._write(StepKind.ERROR, summary)

    async def tool(
        self, name: str, *, summary: str, args: Any = None, output: Any = None, duration_ms: int = 0
    ) -> None:
        await self._write(
            StepKind.TOOL, summary, tool=name, args=args, output=output, duration_ms=duration_ms
        )

    @asynccontextmanager
    async def timed(self, name: str, args: Any = None) -> AsyncIterator[dict[str, Any]]:
        """`async with tracer.timed("geo.horizon", args) as step: step["summary"] = …`."""
        started = time.perf_counter()
        step: dict[str, Any] = {"summary": name, "output": None}
        yield step
        await self.tool(
            name,
            summary=step["summary"],
            args=args,
            output=step["output"],
            duration_ms=round((time.perf_counter() - started) * 1000),
        )

    def add_usage(self, usage: Usage) -> None:
        self.usage = Usage(
            requests=self.usage.requests + usage.requests,
            input_tokens=self.usage.input_tokens + usage.input_tokens,
            output_tokens=self.usage.output_tokens + usage.output_tokens,
        )

    async def _write(
        self,
        kind: StepKind,
        summary: str,
        *,
        tool: str | None = None,
        args: Any = None,
        output: Any = None,
        duration_ms: int | None = None,
    ) -> None:
        async with self._db.unit_of_work() as uow:
            if self._seq is None:
                self._seq = await uow.agents.next_seq(self.run_id) - 1
            self._seq += 1
            step = Step(
                seq=self._seq,
                at=self._clock.now(),
                kind=kind,
                summary=summary[:_TEXT_MAX],
                tool=tool,
                args=to_jsonable_python(args) if args is not None else None,
                output=to_jsonable_python(output) if output is not None else None,
                duration_ms=duration_ms,
            )
            uow.agents.add_step(self.run_id, step)
        await self._events.publish(run_channel(self.run_id), step_event(self.run_id, step))


async def create_run(
    uow: UnitOfWork,
    clock: Clock,
    *,
    agent: AgentKind,
    goal: str,
    planner: Planner,
    subject: dict[str, Any] | None = None,
    parent_run_id: UUID | None = None,
) -> UUID:
    """A queued run without a job: for the CLI and for agents started inside another run."""
    run_id = uuid4()
    uow.agents.add_run(
        run_id=run_id,
        agent=agent,
        goal=goal,
        planner=planner,
        subject=subject or {},
        parent_run_id=parent_run_id,
        now=clock.now(),
    )
    await uow.flush()
    return run_id


async def launch(
    uow: UnitOfWork,
    clock: Clock,
    *,
    agent: AgentKind,
    goal: str,
    planner: Planner,
    job: JobKind,
    payload: dict[str, Any],
    subject: dict[str, Any] | None = None,
    dedupe_key: str | None = None,
    parent_run_id: UUID | None = None,
) -> UUID:
    """Create a queued run and its job in the caller's transaction (transactional outbox)."""
    run_id = await create_run(
        uow,
        clock,
        agent=agent,
        goal=goal,
        planner=planner,
        subject=subject,
        parent_run_id=parent_run_id,
    )
    await uow.jobs.enqueue(
        NewJob(job, {**payload, "run_id": str(run_id)}, dedupe_key=dedupe_key, run_id=run_id),
        now=clock.now(),
    )
    return run_id


AgentBody = Callable[[Tracer], Awaitable[None]]


class AgentRunner:
    """Moves a run through running → done | failed around the agent's body."""

    def __init__(self, db: Database, events: EventBus, clock: Clock) -> None:
        self._db = db
        self._events = events
        self._clock = clock

    def tracer(self, run_id: UUID) -> Tracer:
        return Tracer(self._db, self._events, self._clock, run_id)

    async def run(self, run_id: UUID, body: AgentBody) -> RunStatus:
        tracer = self.tracer(run_id)
        await self._mark(run_id, RunStatus.RUNNING)
        status = RunStatus.DONE
        error: str | None = None
        try:
            await body(tracer)
        except Exception as exc:  # the run is marked failed and the trace says why
            logger.exception("agent run %s failed", run_id)
            status, error = RunStatus.FAILED, repr(exc)
            await tracer.error(f"Запуск прерван: {type(exc).__name__}")
        await self._mark(run_id, status, usage=tracer.usage, error=error)
        await self._events.publish(
            run_channel(run_id),
            {"type": "run.finished", "runId": str(run_id), "status": status.value},
        )
        return status

    async def _mark(
        self,
        run_id: UUID,
        status: RunStatus,
        *,
        usage: Usage | None = None,
        error: str | None = None,
    ) -> None:
        async with self._db.unit_of_work() as uow:
            row = await uow.agents.run_row(run_id)
            if row is None:
                return
            row.status = status.value
            now = self._clock.now()
            if status is RunStatus.RUNNING:
                row.started_at = row.started_at or now
            else:
                row.finished_at = now
                row.error = error
            if usage is not None:
                row.usage = {
                    "requests": usage.requests,
                    "inputTokens": usage.input_tokens,
                    "outputTokens": usage.output_tokens,
                }
