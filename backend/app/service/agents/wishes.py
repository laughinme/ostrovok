"""
Live research (09 §3.2): a guest adds a wish to a search; for the hotels at the top of the
result the system either computes it (learning the characteristic first if it is new) or asks
the hotels, and the result list updates while the guest watches the trace.
"""

from collections.abc import Awaitable, Callable, Sequence
from dataclasses import replace
from uuid import UUID

from app.db.database import Database
from app.db.models import SearchRow
from app.db.repositories.catalog import hotel_geo
from app.db.uow import UnitOfWork
from app.domain.agents import AgentKind, Planner
from app.domain.jobs import JobKind
from app.domain.knowledge.characteristic import MethodKind
from app.domain.search.intent import Chip, Intent
from app.service.agents.curator import Curator
from app.service.agents.researcher import Researcher
from app.service.agents.runtime import AgentRunner, Tracer, launch
from app.service.knowledge.registry import Registry
from app.service.ports import Clock, EventBus
from app.service.search.search import SearchNotFoundError, SearchService
from app.service.search.serialize import intent_from_json, intent_to_json

RESEARCH_TOP = 8

AskHotels = Callable[[Sequence[UUID], str, Tracer], Awaitable[int]]
"""Ask these hotels about this characteristic; returns how many questions were sent."""


def search_channel(search_id: UUID) -> str:
    return f"search:{search_id}"


def describe(chip: Chip) -> str:
    """What the Curator reads: «хинкальная в 10 минутах пешком»."""
    what = str(chip.params.get("what") or chip.label)
    minutes = chip.params.get("maxWalkMinutes")
    return f"{what} в {minutes} минутах пешком" if minutes else what


async def start_wish_research(
    uow: UnitOfWork, clock: Clock, search_id: UUID, chips: Sequence[Chip], hotel_ids: Sequence[UUID]
) -> UUID:
    labels = ", ".join(f"«{c.label}»" for c in chips)
    return await launch(
        uow,
        clock,
        agent=AgentKind.RESEARCHER,
        goal=f"Узнать {labels} для {len(hotel_ids)} отелей из выдачи",
        planner=Planner.RULES,
        job=JobKind.RESEARCH_WISH,
        payload={
            "search_id": str(search_id),
            "chip_ids": [c.id for c in chips],
            "hotel_ids": [str(h) for h in hotel_ids],
        },
        subject={"searchId": str(search_id), "hotelIds": [str(h) for h in hotel_ids]},
    )


class WishResearch:
    def __init__(
        self,
        db: Database,
        runner: AgentRunner,
        researcher: Researcher,
        curator: Curator,
        events: EventBus,
        *,
        clock: Clock,
        ask_hotels: AskHotels | None = None,
    ) -> None:
        self._db = db
        self._runner = runner
        self._researcher = researcher
        self._curator = curator
        self._events = events
        self._clock = clock
        self._ask_hotels = ask_hotels

    async def run(
        self, run_id: UUID, search_id: UUID, chip_ids: Sequence[str], hotel_ids: Sequence[UUID]
    ) -> None:
        async def body(tracer: Tracer) -> None:
            intent = await self._intent(search_id)
            for chip in [c for c in intent.chips if c.id in chip_ids]:
                await self._one(search_id, chip, hotel_ids, tracer)
            await self._events.publish(
                search_channel(search_id), {"type": "search.updated", "searchId": str(search_id)}
            )

        await self._runner.run(run_id, body)

    async def _one(
        self, search_id: UUID, chip: Chip, hotel_ids: Sequence[UUID], tracer: Tracer
    ) -> None:
        key = chip.characteristic
        if key is None:
            lesson = await self._curator.learn(describe(chip), tracer, sample=hotel_ids)
            if lesson.characteristic is None:
                return
            key = lesson.characteristic.key
            await self._attach(search_id, chip, key)
        async with self._db.unit_of_work() as uow:
            characteristic = await Registry(uow).get(key)
        if characteristic.method is MethodKind.ASK_HOTELIER:
            if self._ask_hotels is None:
                await tracer.decide("Спросим отели: вопрос появится в их кабинетах")
                return
            sent = await self._ask_hotels(hotel_ids, key, tracer)
            await tracer.decide(f"Отправили вопрос {sent} отелям; ответы придут в выдачу")
            return
        async with self._db.unit_of_work() as uow:
            hotels = [hotel_geo(h) for h in await uow.catalog.hotels(list(hotel_ids))]
        for hotel in hotels:
            await self._researcher.study(hotel, [characteristic], tracer)

    async def _intent(self, search_id: UUID) -> Intent:
        async with self._db.unit_of_work() as uow:
            row = await uow.session.get(SearchRow, search_id)
            if row is None:
                raise SearchNotFoundError()
            return intent_from_json(row.intent)

    async def _attach(self, search_id: UUID, chip: Chip, key: str) -> None:
        """The learned characteristic becomes the chip's key: the search can now check it."""
        async with self._db.unit_of_work() as uow:
            row = await uow.session.get(SearchRow, search_id)
            if row is None:
                return
            intent = intent_from_json(row.intent)
            chips = tuple(
                replace(c, characteristic=key) if c.id == chip.id else c for c in intent.chips
            )
            row.intent = intent_to_json(replace(intent, chips=chips))


async def add_wishes(
    svc: SearchService, uow: UnitOfWork, clock: Clock, search_id: UUID, new: Intent
) -> tuple[UUID | None, Intent]:
    """Append the parsed chips to the search and start research for those we cannot answer."""
    view = await svc.get(search_id)
    start = len(view.intent.chips) + 1
    added = tuple(replace(c, id=f"c{start + i}") for i, c in enumerate(new.chips))
    intent = replace(view.intent, chips=view.intent.chips + added)
    updated = await svc.update_intent(search_id, intent)
    top = [m.hotel.id for m in updated.ranking.matches[:RESEARCH_TOP]]
    unknown = [
        c
        for c in added
        if c.characteristic is None
        or any(
            r.chip_id == c.id and r.verdict.value == "unknown"
            for m in updated.ranking.matches[:RESEARCH_TOP]
            for r in m.per_chip
        )
    ]
    if not unknown or not top:
        return None, intent
    return await start_wish_research(uow, clock, search_id, unknown, top), intent
