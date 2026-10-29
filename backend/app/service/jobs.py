import asyncio
import logging
from collections.abc import Awaitable, Callable, Mapping
from contextlib import suppress
from datetime import timedelta

from sqlalchemy import update

from app.db.database import Database
from app.db.models import Job
from app.domain.jobs import ClaimedJob, JobKind, JobStatus, NewJob, retry_delay
from app.service.ports import Clock

logger = logging.getLogger(__name__)

Handler = Callable[[ClaimedJob], Awaitable[None]]

_ERROR_TEXT_MAX = 2000


class JobQueue:
    def __init__(self, db: Database, clock: Clock) -> None:
        self._db = db
        self._clock = clock

    async def enqueue(self, job: NewJob) -> bool:
        async with self._db.unit_of_work() as uow:
            return await uow.jobs.enqueue(job, now=self._clock.now())


class JobRunner:
    def __init__(
        self,
        db: Database,
        handlers: Mapping[JobKind, Handler],
        clock: Clock,
        *,
        worker_id: str,
        lease: timedelta,
        max_attempts: int,
    ) -> None:
        self._db = db
        self._handlers = handlers
        self._clock = clock
        self._worker_id = worker_id
        self._lease = lease
        self._max_attempts = max_attempts

    async def claim(self, limit: int) -> list[ClaimedJob]:
        async with self._db.unit_of_work() as uow:
            jobs = await uow.jobs.claim(
                limit=limit, now=self._clock.now(), lease=self._lease, worker=self._worker_id
            )
            return [
                ClaimedJob(
                    id=job.id,
                    kind=JobKind(job.kind),
                    payload=job.payload,
                    attempt=job.attempts,
                    run_id=job.run_id,
                )
                for job in jobs
            ]

    async def execute(self, job: ClaimedJob) -> None:
        handler = self._handlers.get(job.kind)
        if handler is None:
            await self._finish(job, error=f"no handler for job kind {job.kind!r}", final=True)
            return

        heartbeat = asyncio.create_task(self._keep_lease(job))
        try:
            await handler(job)
        except Exception as exc:
            logger.warning("job %s (%s) failed", job.id, job.kind, exc_info=True)
            await self._finish(job, error=repr(exc), final=job.attempt >= self._max_attempts)
        else:
            await self._finish(job, error=None, final=True)
        finally:
            heartbeat.cancel()
            with suppress(asyncio.CancelledError):
                await heartbeat

    async def _keep_lease(self, job: ClaimedJob) -> None:
        interval = self._lease.total_seconds() / 3
        while True:
            await asyncio.sleep(interval)
            async with self._db.unit_of_work() as uow:
                await uow.session.execute(
                    update(Job)
                    .where(Job.id == job.id, Job.locked_by == self._worker_id)
                    .values(lease_until=self._clock.now() + self._lease)
                )

    async def _finish(self, job: ClaimedJob, *, error: str | None, final: bool) -> None:
        now = self._clock.now()
        async with self._db.unit_of_work() as uow:
            row = await uow.jobs.get(job.id, for_update=True)
            if row is None or row.locked_by != self._worker_id:
                return
            row.lease_until = None
            row.locked_by = None
            if error is None:
                row.status = JobStatus.DONE
                row.finished_at = now
                return
            row.last_error = error[:_ERROR_TEXT_MAX]
            if final:
                row.status = JobStatus.DEAD
                row.finished_at = now
                logger.error("job %s (%s) is dead: %s", job.id, job.kind, error)
            else:
                row.status = JobStatus.PENDING
                row.available_at = now + retry_delay(job.attempt)
