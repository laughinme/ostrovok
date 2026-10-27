"""Read side of agent runs: the trace for the console and the live feed for the guest."""

import asyncio
from collections.abc import AsyncIterator, Sequence
from contextlib import suppress
from typing import Any
from uuid import UUID

from app.db.database import Database
from app.domain.agents import AgentKind, AgentRun, RunNotFoundError, RunStatus
from app.service.agents.runtime import run_channel, step_event
from app.service.ports import EventBus

_FINISHED = (RunStatus.DONE, RunStatus.FAILED)
_HEARTBEAT_SEC = 15.0


class RunQueries:
    def __init__(self, db: Database) -> None:
        self._db = db

    async def get(self, run_id: UUID) -> AgentRun:
        async with self._db.unit_of_work() as uow:
            run = await uow.agents.run(run_id)
        if run is None:
            raise RunNotFoundError()
        return run

    async def recent(
        self, *, agent: AgentKind | None = None, hotel_id: UUID | None = None, limit: int = 50
    ) -> list[AgentRun]:
        async with self._db.unit_of_work() as uow:
            return await uow.agents.runs(agent=agent, hotel_id=hotel_id, limit=limit)


class RunStream:
    """
    SSE for one run: subscribe first, replay the steps already in the database, then forward
    live steps, skipping any seq already sent; ends with `run.finished`.
    """

    def __init__(self, db: Database, events: EventBus) -> None:
        self._db = db
        self._events = events

    async def events(self, run_id: UUID) -> AsyncIterator[dict[str, Any] | None]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        listener = asyncio.create_task(self._listen(run_channel(run_id), queue))
        try:
            run = await RunQueries(self._db).get(run_id)
            sent = 0
            for step in run.steps:
                sent = step.seq
                yield step_event(run_id, step)
            if run.status in _FINISHED:
                yield _finished(run_id, run.status)
                return
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=_HEARTBEAT_SEC)
                except TimeoutError:
                    yield None  # heartbeat keeps proxies from closing the stream
                    continue
                if event.get("type") == "run.step":
                    if event["step"]["seq"] <= sent:
                        continue
                    sent = event["step"]["seq"]
                yield event
                if event.get("type") == "run.finished":
                    return
        finally:
            listener.cancel()
            with suppress(asyncio.CancelledError):
                await listener

    async def channel(self, channels: Sequence[str]) -> AsyncIterator[dict[str, Any] | None]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        listeners = [asyncio.create_task(self._listen(c, queue)) for c in channels]
        try:
            while True:
                try:
                    yield await asyncio.wait_for(queue.get(), timeout=_HEARTBEAT_SEC)
                except TimeoutError:
                    yield None
        finally:
            for listener in listeners:
                listener.cancel()

    async def _listen(self, channel: str, queue: asyncio.Queue[dict[str, Any]]) -> None:
        async for event in self._events.subscribe(channel):
            await queue.put(event)


def _finished(run_id: UUID, status: RunStatus) -> dict[str, Any]:
    return {"type": "run.finished", "runId": str(run_id), "status": status.value}
