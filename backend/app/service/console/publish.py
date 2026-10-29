from dataclasses import replace
from uuid import UUID

from app.db.database import Database
from app.db.repositories.catalog import hotel_geo
from app.db.uow import UnitOfWork
from app.domain.agents import AgentKind, Planner
from app.domain.jobs import JobKind
from app.domain.knowledge.characteristic import CharacteristicStatus
from app.service.agents.curator import Curator
from app.service.agents.researcher import Researcher
from app.service.agents.runtime import AgentRunner, Tracer, launch
from app.service.knowledge.registry import Registry
from app.service.ports import Clock


async def start_learning(uow: UnitOfWork, clock: Clock, description: str) -> UUID:
    return await launch(
        uow,
        clock,
        agent=AgentKind.CURATOR,
        goal=f"Научиться проверять: «{description}»",
        planner=Planner.RULES,
        job=JobKind.CURATOR_LEARN,
        payload={"description": description},
    )


async def start_publish(uow: UnitOfWork, clock: Clock, key: str) -> UUID:
    characteristic = await Registry(uow).get(key)
    return await launch(
        uow,
        clock,
        agent=AgentKind.RESEARCHER,
        goal=f"Посчитать «{characteristic.title}» для всех отелей региона",
        planner=Planner.RULES,
        job=JobKind.CHARACTERISTIC_PUBLISH,
        payload={"key": key},
        dedupe_key=f"publish:{key}:{characteristic.version}",
    )


class ConsoleAgents:
    def __init__(
        self, db: Database, runner: AgentRunner, curator: Curator, researcher: Researcher
    ) -> None:
        self._db = db
        self._runner = runner
        self._curator = curator
        self._researcher = researcher

    async def learn(self, run_id: UUID, description: str) -> None:
        async def body(tracer: Tracer) -> None:
            await self._curator.learn(
                description, tracer, status=CharacteristicStatus.DRAFT, learned_from="консоль"
            )

        await self._runner.run(run_id, body)

    async def publish(self, run_id: UUID, key: str) -> None:
        async def body(tracer: Tracer) -> None:
            async with self._db.unit_of_work() as uow:
                registry = Registry(uow)
                characteristic = await registry.get(key)
                characteristic = replace(characteristic, status=CharacteristicStatus.PUBLISHED)
                await registry.put(characteristic)
                hotels = [hotel_geo(h) for h in await uow.catalog.hotels()]
            await tracer.reason(
                f"Публикую «{characteristic.title}»: считаю для {len(hotels)} отелей"
            )
            changed = 0
            for hotel in hotels:
                changed += await self._researcher.study(hotel, [characteristic], tracer)
            await tracer.decide(f"Опубликовано: изменилось фактов - {changed}")

        await self._runner.run(run_id, body)
