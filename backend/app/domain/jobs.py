from dataclasses import dataclass
from datetime import timedelta
from enum import StrEnum
from typing import Any
from uuid import UUID


class JobStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    DEAD = "dead"


class JobKind(StrEnum):
    """Every background job type; the worker maps each one to exactly one handler (09 §4.5)."""

    RESEARCH_COLLECT = "research.collect"
    RESEARCH_WISH = "research.wish"
    CURATOR_LEARN = "curator.learn"
    CHARACTERISTIC_PUBLISH = "characteristic.publish"
    HOTEL_ONBOARD = "hotel.onboard"
    WORLD_CHANGED = "world.changed"
    HOTELIER_SIMULATE = "hotelier.simulate"
    BOOKING_FACT_CHANGED = "booking.fact_changed"
    BOOKING_SIMULATE = "booking.simulate"
    NOTIFY = "notify"
    FRESHNESS_SCAN = "freshness.scan"


# A dedupe key is unique among unfinished jobs: ten identical searches start one computation.
ACTIVE_STATUSES = (JobStatus.PENDING, JobStatus.RUNNING)

_MAX_RETRY_DELAY = timedelta(minutes=10)


def retry_delay(attempt: int) -> timedelta:
    """Exponential backoff: 2 s, 4 s, 8 s ... capped at ten minutes."""
    return min(timedelta(seconds=2**attempt), _MAX_RETRY_DELAY)


@dataclass(frozen=True, slots=True)
class NewJob:
    kind: JobKind
    payload: dict[str, Any]
    dedupe_key: str | None = None
    run_id: UUID | None = None
    delay: timedelta = timedelta(0)


@dataclass(frozen=True, slots=True)
class ClaimedJob:
    """A job leased to one worker. The lease is extended while the handler runs."""

    id: UUID
    kind: JobKind
    payload: dict[str, Any]
    attempt: int
    run_id: UUID | None
