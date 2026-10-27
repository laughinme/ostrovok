from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UuidPkMixin, pg_enum, utcnow
from app.domain.jobs import JobStatus


class Job(UuidPkMixin, Base):
    """
    A unit of background work, written in the same transaction as the command that caused it.
    Workers lease jobs with SKIP LOCKED; an expired lease means the worker died: the job is retried.
    """

    __tablename__ = "jobs"

    kind: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    status: Mapped[JobStatus] = mapped_column(
        pg_enum(JobStatus, "job_status"),
        default=JobStatus.PENDING,
        server_default=JobStatus.PENDING.value,
    )
    attempts: Mapped[int] = mapped_column(default=0, server_default="0")
    dedupe_key: Mapped[str | None] = mapped_column(String(255))
    run_id: Mapped[UUID | None]
    last_error: Mapped[str | None] = mapped_column(Text)
    locked_by: Mapped[str | None] = mapped_column(String(64))

    created_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())
    available_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())
    lease_until: Mapped[datetime | None]
    finished_at: Mapped[datetime | None]

    __table_args__ = (
        Index("ix_jobs_pending", "available_at", postgresql_where=text("status = 'pending'")),
        Index("ix_jobs_running_lease", "lease_until", postgresql_where=text("status = 'running'")),
        Index(
            "uq_jobs_active_dedupe_key",
            "dedupe_key",
            unique=True,
            postgresql_where=text("status IN ('pending', 'running')"),
        ),
    )
