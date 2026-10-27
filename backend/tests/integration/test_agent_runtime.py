from app.db.database import Database
from app.domain.agents import AgentKind, Planner, RunStatus, StepKind
from app.domain.jobs import JobKind
from app.service.agents.runtime import AgentRunner, Tracer, launch
from app.service.ports import RecordingEventBus
from tests.factories import FakeClock


async def _launch(db: Database, clock: FakeClock) -> object:
    async with db.unit_of_work() as uow:
        return await launch(
            uow,
            clock,
            agent=AgentKind.RESEARCHER,
            goal="узнать вид на море для «Маяка»",
            planner=Planner.RULES,
            job=JobKind.RESEARCH_COLLECT,
            payload={"hotel": "way/1"},
        )


async def test_steps_are_written_in_order_and_published(db: Database) -> None:
    clock, bus = FakeClock(), RecordingEventBus()
    run_id = await _launch(db, clock)

    async def body(tracer: Tracer) -> None:
        await tracer.reason("рецепт: view(sea)")
        async with tracer.timed("geo.horizon", {"facade": "SW"}) as step:
            step["summary"] = "горизонт по 141 лучу"
        await tracer.decide("море видно с 4-го этажа")

    status = await AgentRunner(db, bus, clock).run(run_id, body)  # type: ignore[arg-type]

    async with db.unit_of_work() as uow:
        run = await uow.agents.run(run_id)  # type: ignore[arg-type]
        claimed = await uow.jobs.claim(
            limit=5, now=clock.now(), lease=clock.now() - clock.now(), worker="w"
        )
    assert status is RunStatus.DONE
    assert run is not None
    assert [s.seq for s in run.steps] == [1, 2, 3]
    assert [s.kind for s in run.steps] == [StepKind.REASON, StepKind.TOOL, StepKind.DECISION]
    assert run.steps[1].tool == "geo.horizon"
    assert [e["type"] for _, e in bus.published] == ["run.step"] * 3 + ["run.finished"]
    assert claimed[0].run_id == run_id


async def test_failing_agent_marks_the_run_failed(db: Database) -> None:
    clock, bus = FakeClock(), RecordingEventBus()
    run_id = await _launch(db, clock)

    async def body(tracer: Tracer) -> None:
        await tracer.reason("начинаю")
        raise RuntimeError("DEM missing")

    status = await AgentRunner(db, bus, clock).run(run_id, body)  # type: ignore[arg-type]

    async with db.unit_of_work() as uow:
        run = await uow.agents.run(run_id)  # type: ignore[arg-type]
    assert status is RunStatus.FAILED
    assert run is not None
    assert run.status is RunStatus.FAILED
    assert run.steps[-1].kind is StepKind.ERROR
