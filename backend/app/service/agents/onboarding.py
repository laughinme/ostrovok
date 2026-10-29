from uuid import UUID

from app.domain.agents import RunStatus
from app.service.agents.collect import CollectService
from app.service.agents.liaison import Liaison
from app.service.agents.runtime import AgentRunner, Tracer
from app.service.ports import Clock


class OnboardHotel:
    def __init__(self, collect: CollectService, runner: AgentRunner, clock: Clock) -> None:
        self._collect, self._runner = collect, runner
        self._liaison = Liaison(runner.db, clock)

    async def run(self, run_id: UUID, hotel_id: UUID) -> None:
        async def ask(tracer: Tracer) -> None:
            await self._liaison.ask(hotel_id, tracer, limit=3)

        await self._collect.study(hotel_id, run_id=run_id, after_study=ask)
        async with self._runner.db.unit_of_work() as uow:
            row = await uow.agents.run_row(run_id)
            if row is None or row.status != RunStatus.DONE:
                raise RuntimeError("Hotel onboarding failed; research job must be retried")
