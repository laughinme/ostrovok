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
from uuid import UUID

from redis.asyncio import Redis

from app.bootstrap import Agents, build_agents, build_language_model
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.db.database import Database
from app.domain.jobs import ClaimedJob, JobKind, NewJob
from app.infra.events import RedisEventBus
from app.infra.partner_truth import YamlHiddenTruth
from app.service.agents.collect import CollectService
from app.service.agents.freshness import FreshnessScan
from app.service.agents.onboarding import OnboardHotel
from app.service.agents.simulator import HotelierSimulator
from app.service.agents.wishes import WishResearch
from app.service.booking.simulator import BookingSimulator
from app.service.console.publish import ConsoleAgents
from app.service.jobs import Handler, JobQueue, JobRunner
from app.service.ports import Clock, SystemClock

logger = logging.getLogger("app.worker")

_KEEP_DEAD_SESSIONS = timedelta(days=7)
HEARTBEAT = Path(tempfile.gettempdir()) / "okno-worker-alive"


@dataclass(frozen=True, slots=True)
class Periodic:
    kind: JobKind
    every: timedelta


PERIODIC = (Periodic(JobKind.FRESHNESS_SCAN, timedelta(minutes=10)),)


async def cleanup_sessions(db: Database, clock: Clock) -> int:
    async with db.unit_of_work() as uow:
        return await uow.sessions.delete_stale(before=clock.now() - _KEEP_DEAD_SESSIONS)


class Worker:
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
            except Exception:
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


def _run(job: ClaimedJob) -> UUID:
    if job.run_id is None:
        raise RuntimeError(f"job {job.kind} has no agent run")
    return job.run_id


def build_handlers(
    collect: CollectService,
    booking: BookingSimulator | None = None,
    hotelier: HotelierSimulator | None = None,
    wishes: WishResearch | None = None,
    agents: Agents | None = None,
) -> dict[JobKind, Handler]:

    async def research_collect(job: ClaimedJob) -> None:
        keys = job.payload.get("keys")
        await collect.study(
            UUID(job.payload["hotel_id"]),
            characteristics_keys=keys,
            run_id=job.run_id,
        )

    async def booking_simulate(job: ClaimedJob) -> None:
        if booking is None:
            raise RuntimeError("Booking simulator is not configured")
        await booking.respond(UUID(job.payload["booking_id"]))

    async def booking_fact_changed(job: ClaimedJob) -> None:
        if booking is None:
            raise RuntimeError("Booking simulator is not configured")
        await booking.notify_changes(UUID(job.payload["hotel_id"]), job.payload["characteristic"])

    async def research_wish(job: ClaimedJob) -> None:
        if wishes is None or job.run_id is None:
            raise RuntimeError("Wish research is not configured")
        await wishes.run(
            job.run_id,
            UUID(job.payload["search_id"]),
            job.payload["chip_ids"],
            [UUID(h) for h in job.payload["hotel_ids"]],
        )

    async def hotelier_simulate(job: ClaimedJob) -> None:
        if hotelier is None:
            raise RuntimeError("Hotelier simulator is not configured")
        await hotelier.respond(UUID(job.payload["question_id"]))

    def _agents() -> Agents:
        if agents is None:
            raise RuntimeError("Agents are not configured")
        return agents

    def _console() -> ConsoleAgents:
        a = _agents()
        return ConsoleAgents(a.runner.db, a.runner, a.curator, a.researcher)

    async def curator_learn(job: ClaimedJob) -> None:
        await _console().learn(_run(job), job.payload["description"])

    async def characteristic_publish(job: ClaimedJob) -> None:
        await _console().publish(_run(job), job.payload["key"])

    async def world_changed(job: ClaimedJob) -> None:
        await _agents().watcher.react(_run(job), UUID(job.payload["change_id"]))

    async def hotel_onboard(job: ClaimedJob) -> None:
        a = _agents()
        await OnboardHotel(collect, a.runner, a.env.clock).run(
            _run(job), UUID(job.payload["hotel_id"])
        )

    async def freshness_scan(_: ClaimedJob) -> None:
        queued = await FreshnessScan(_agents().runner.db, SystemClock()).run()
        logger.info("freshness scan queued %s re-checks", queued)

    return {
        JobKind.CURATOR_LEARN: curator_learn,
        JobKind.CHARACTERISTIC_PUBLISH: characteristic_publish,
        JobKind.WORLD_CHANGED: world_changed,
        JobKind.FRESHNESS_SCAN: freshness_scan,
        JobKind.HOTELIER_SIMULATE: hotelier_simulate,
        JobKind.RESEARCH_WISH: research_wish,
        JobKind.BOOKING_FACT_CHANGED: booking_fact_changed,
        JobKind.RESEARCH_COLLECT: research_collect,
        JobKind.HOTEL_ONBOARD: hotel_onboard,
        JobKind.BOOKING_SIMULATE: booking_simulate,
    }


async def run_worker(settings: Settings) -> None:
    db = Database(settings)
    clock = SystemClock()
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    llm = build_language_model(settings, db, redis)
    agents = build_agents(
        db,
        RedisEventBus(redis),
        clock,
        settings.data_dir,
        llm,
        llm_strong=build_language_model(settings, db, redis, strong=True),
        simulator_delay=settings.simulator_delay_range
        if settings.hotelier_simulator == "on"
        else None,
    )
    collect = CollectService(db, agents.researcher, agents.runner, clock)
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)

    runner = JobRunner(
        db,
        build_handlers(
            collect,
            BookingSimulator(db, clock, RedisEventBus(redis)),
            hotelier=HotelierSimulator(
                db,
                clock,
                RedisEventBus(redis),
                YamlHiddenTruth(settings.data_dir / "demo/hidden_truth.yaml"),
                llm,
            )
            if settings.hotelier_simulator == "on"
            else None,
            wishes=agents.wishes,
            agents=agents,
        ),
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
    await redis.aclose()
    await db.dispose()
    logger.info("worker stopped")


def main() -> None:
    settings = get_settings()
    configure_logging(settings.log_level, as_json=settings.log_json)
    asyncio.run(run_worker(settings))


if __name__ == "__main__":
    main()
