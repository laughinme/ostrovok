from collections.abc import Sequence
from datetime import datetime, timedelta

from sqlalchemy import or_, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Job
from app.domain.jobs import JobStatus, NewJob


class JobRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def enqueue(self, job: NewJob, *, now: datetime) -> bool:
        stmt = (
            insert(Job)
            .values(
                kind=job.kind.value,
                payload=job.payload,
                dedupe_key=job.dedupe_key,
                run_id=job.run_id,
                created_at=now,
                available_at=now + job.delay,
            )
            .on_conflict_do_nothing(
                index_elements=["dedupe_key"],
                index_where=text("status IN ('pending', 'running')"),
            )
            .returning(Job.id)
        )
        return (await self._session.scalar(stmt)) is not None

    async def claim(
        self, *, limit: int, now: datetime, lease: timedelta, worker: str
    ) -> Sequence[Job]:
        # SKIP LOCKED lets several workers share the queue without grabbing the same job.
        # A running job whose lease ran out belongs to a dead worker, so it gets taken over.
        stmt = (
            select(Job)
            .where(
                or_(
                    (Job.status == JobStatus.PENDING) & (Job.available_at <= now),
                    (Job.status == JobStatus.RUNNING) & (Job.lease_until < now),
                )
            )
            .order_by(Job.available_at)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        jobs = (await self._session.scalars(stmt)).all()
        for job in jobs:
            job.status = JobStatus.RUNNING
            job.attempts += 1
            job.lease_until = now + lease
            job.locked_by = worker
        return jobs

    async def get(self, job_id: object, *, for_update: bool = False) -> Job | None:
        stmt = select(Job).where(Job.id == job_id).execution_options(populate_existing=True)
        if for_update:
            stmt = stmt.with_for_update()
        return await self._session.scalar(stmt)
