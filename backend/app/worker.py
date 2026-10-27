import asyncio
import logging
import os
import signal
import socket
import tempfile
from contextlib import suppress
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.db.database import Database
from app.domain.jobs import JobKind, NewJob
from app.service.jobs import Handler, JobQueue, JobRunner
from app.service.ports import Clock, SystemClock

logger = logging.getLogger("app.worker")

_KEEP_DEAD_SESSIONS = timedelta(days=7)
# The Compose healthcheck reads this file's age: a stuck event loop stops touching it.
HEARTBEAT = Path(tempfile.gettempdir()) / "okno-worker-alive"


@dataclass(frozen=True, slots=True)
class Periodic:
    """A job the worker enqueues on a timer; the dedupe key keeps one copy in flight."""

    kind: JobKind
    every: timedelta


PERIODIC = (Periodic(JobKind.FRESHNESS_SCAN, timedelta(minutes=10)),)


async def cleanup_sessions(db: Database, clock: Clock) -> int:
    async with db.unit_of_work() as uow:
        return await uow.sessions.delete_stale(before=clock.now() - _KEEP_DEAD_SESSIONS)


class Worker:
    """
    Separate process (`python -m app.worker`), same image as the API.
    Runs up to `slots` jobs at once; several worker processes can share one queue.
    """

    def __init__(
        self, runner: JobRunner, queue: JobQueue, clock: Clock, *, slots: int, poll_sec: float
    ) -> None:
        self._runner = runner
        self._queue = queue
        self._clock = clock
        self._slots = slots
        self._poll_sec = poll_sec
        self._running: set[asyncio.Task[None]] = set()
        self._next_tick: dict[JobKind, datetime] = {}

    async def run(self, stop: asyncio.Event) -> None:
        while not stop.is_set():
            HEARTBEAT.touch()
            claimed = 0
            try:
                await self._tick_periodic()
                claimed = await self._fill_slots()
            except Exception:  # a DB blip must not kill the worker; log and keep polling
                logger.exception("worker iteration failed")
            if claimed == 0:
                with suppress(TimeoutError):
                    await asyncio.wait_for(stop.wait(), timeout=self._poll_sec)
        if self._running:
            await asyncio.wait(self._running)

    async def _fill_slots(self) -> int:
        free = self._slots - len(self._running)
        if free <= 0:
            return 0
        jobs = await self._runner.claim(free)
        for job in jobs:
            task = asyncio.create_task(self._runner.execute(job), name=f"job:{job.kind}")
            self._running.add(task)
            task.add_done_callback(self._running.discard)
        return len(jobs)

    async def _tick_periodic(self) -> None:
        now = self._clock.now()
        for periodic in PERIODIC:
            if now < self._next_tick.get(periodic.kind, now):
                continue
            await self._queue.enqueue(
                NewJob(periodic.kind, payload={}, dedupe_key=f"periodic:{periodic.kind}")
            )
            self._next_tick[periodic.kind] = now + periodic.every


def build_handlers() -> dict[JobKind, Handler]:
    """Kind → handler. Agents register theirs here as they land (B2.11 and later)."""
    return {}


async def run_worker(settings: Settings) -> None:
    db = Database(settings)
    clock = SystemClock()
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)

    runner = JobRunner(
        db,
        build_handlers(),
        clock,
        worker_id=f"{socket.gethostname()}:{os.getpid()}",
        lease=timedelta(seconds=settings.jobs_lease_sec),
        max_attempts=settings.jobs_max_attempts,
    )
    worker = Worker(
        runner,
        JobQueue(db, clock),
        clock,
        slots=settings.jobs_batch_size,
        poll_sec=settings.jobs_poll_interval_sec,
    )
    logger.info("worker started")
    removed = await cleanup_sessions(db, clock)
    logger.info("removed %s stale sessions", removed)
    await worker.run(stop)
    await db.dispose()
    logger.info("worker stopped")


def main() -> None:
    settings = get_settings()
    configure_logging(settings.log_level, as_json=settings.log_json)
    asyncio.run(run_worker(settings))


if __name__ == "__main__":
    main()
