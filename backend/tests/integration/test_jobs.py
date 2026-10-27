from datetime import timedelta

from sqlalchemy import select

from app.db.database import Database
from app.db.models import Job
from app.domain.jobs import ClaimedJob, JobKind, JobStatus, NewJob
from app.service.jobs import Handler, JobQueue, JobRunner
from tests.factories import FakeClock

LEASE = timedelta(seconds=60)


def _runner(
    db: Database, clock: FakeClock, handlers: dict[JobKind, Handler], *, worker: str = "w1"
) -> JobRunner:
    return JobRunner(db, handlers, clock, worker_id=worker, lease=LEASE, max_attempts=2)


async def _job(db: Database) -> Job:
    async with db.raw_session() as session:
        return (await session.scalars(select(Job))).one()


async def test_duplicate_dedupe_key_is_not_enqueued(db: Database) -> None:
    queue = JobQueue(db, FakeClock())
    job = NewJob(JobKind.RESEARCH_COLLECT, {"hotel": "h1"}, dedupe_key="collect:h1:sea_view:1")

    assert await queue.enqueue(job)
    assert not await queue.enqueue(job)


async def test_finished_job_frees_its_dedupe_key(db: Database) -> None:
    clock = FakeClock()
    queue = JobQueue(db, clock)
    job = NewJob(JobKind.NOTIFY, {}, dedupe_key="notify:1")
    seen: list[ClaimedJob] = []

    async def handle(claimed: ClaimedJob) -> None:
        seen.append(claimed)

    runner = _runner(db, clock, {JobKind.NOTIFY: handle})
    await queue.enqueue(job)
    for claimed in await runner.claim(5):
        await runner.execute(claimed)

    assert len(seen) == 1
    assert (await _job(db)).status is JobStatus.DONE
    assert await queue.enqueue(job)


async def test_delayed_job_is_not_taken_early(db: Database) -> None:
    clock = FakeClock()
    await JobQueue(db, clock).enqueue(
        NewJob(JobKind.HOTELIER_SIMULATE, {}, delay=timedelta(seconds=20))
    )
    runner = _runner(db, clock, {})

    assert await runner.claim(5) == []
    clock.advance(timedelta(seconds=21))
    assert len(await runner.claim(5)) == 1


async def test_job_of_a_dead_worker_is_taken_over_after_the_lease(db: Database) -> None:
    clock = FakeClock()
    await JobQueue(db, clock).enqueue(NewJob(JobKind.RESEARCH_COLLECT, {}))
    first = _runner(db, clock, {}, worker="w1")
    second = _runner(db, clock, {}, worker="w2")

    assert len(await first.claim(5)) == 1
    assert await second.claim(5) == []
    clock.advance(LEASE + timedelta(seconds=1))
    taken = await second.claim(5)

    assert [job.attempt for job in taken] == [2]
    assert (await _job(db)).locked_by == "w2"


async def test_failing_job_is_retried_then_dead(db: Database) -> None:
    clock = FakeClock()

    async def broken(claimed: ClaimedJob) -> None:
        raise RuntimeError("tool crashed")

    runner = _runner(db, clock, {JobKind.RESEARCH_COLLECT: broken})
    await JobQueue(db, clock).enqueue(NewJob(JobKind.RESEARCH_COLLECT, {}))

    for claimed in await runner.claim(5):
        await runner.execute(claimed)
    job = await _job(db)
    assert job.status is JobStatus.PENDING
    assert job.available_at > clock.now()

    clock.advance(timedelta(minutes=1))
    for claimed in await runner.claim(5):
        await runner.execute(claimed)
    job = await _job(db)
    assert job.status is JobStatus.DEAD
    assert job.last_error is not None
    assert "tool crashed" in job.last_error
