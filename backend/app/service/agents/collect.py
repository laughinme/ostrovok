"""Batch contour (09 §3.1): the Researcher over every hotel, one traced run per hotel."""

import asyncio
import logging
from collections.abc import Sequence
from uuid import UUID

from app.db.database import Database
from app.db.repositories.catalog import hotel_geo
from app.domain.agents import AgentKind, Planner
from app.service.agents.researcher import Researcher
from app.service.agents.runtime import AgentBody, AgentRunner, Tracer, create_run
from app.service.ports import Clock

logger = logging.getLogger(__name__)


class CollectService:
    def __init__(
        self, db: Database, researcher: Researcher, runner: AgentRunner, clock: Clock
    ) -> None:
        self._db = db
        self._researcher = researcher
        self._runner = runner
        self._clock = clock

    async def collect(
        self,
        hotel_ids: Sequence[UUID] | None = None,
        keys: Sequence[str] | None = None,
        *,
        concurrency: int = 4,
    ) -> int:
        async with self._db.unit_of_work() as uow:
            hotels = [hotel_geo(h) for h in await uow.catalog.hotels(hotel_ids)]
        characteristics = await self._researcher.characteristics(keys)
        gate = asyncio.Semaphore(concurrency)
        done = 0

        async def one(index: int) -> int:
            nonlocal done
            hotel = hotels[index]
            async with gate:
                changed = await self.study(hotel.id, characteristics_keys=keys)
                done += 1
                logger.info("collect %s/%s %s: %s facts", done, len(hotels), hotel.name, changed)
                return changed

        logger.info("collect: %s hotels × %s characteristics", len(hotels), len(characteristics))
        results = await asyncio.gather(*(one(i) for i in range(len(hotels))))
        return sum(results)

    async def study(
        self,
        hotel_id: UUID,
        *,
        characteristics_keys: Sequence[str] | None = None,
        run_id: UUID | None = None,
        after_study: AgentBody | None = None,
    ) -> int:
        async with self._db.unit_of_work() as uow:
            row = await uow.catalog.hotel(hotel_id)
            if row is None:
                return 0
            hotel = hotel_geo(row)
            if run_id is None:
                run_id = await create_run(
                    uow,
                    self._clock,
                    agent=AgentKind.RESEARCHER,
                    goal=f"Изучить «{hotel.name}»",
                    planner=Planner.RULES,
                    subject={"hotelIds": [str(hotel.id)]},
                )
        characteristics = await self._researcher.characteristics(characteristics_keys)
        changed = 0

        async def body(tracer: Tracer) -> None:
            nonlocal changed
            changed = await self._researcher.study(hotel, characteristics, tracer)
            if after_study is not None:
                await after_study(tracer)

        await self._runner.run(run_id, body)
        return changed
