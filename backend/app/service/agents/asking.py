from collections.abc import Sequence
from uuid import UUID, uuid4

from sqlalchemy import text as sql_text
from sqlalchemy.dialects.postgresql import insert

from app.db.database import Database
from app.db.models import HotelierQuestion
from app.service.agents.runtime import Tracer
from app.service.knowledge.registry import Registry
from app.service.partner.simulation import schedule_simulation
from app.service.ports import Clock

LIVE_QUESTION_VALUE = 10.0


class HotelAsker:
    def __init__(
        self, db: Database, clock: Clock, *, simulator_delay: tuple[float, float] | None
    ) -> None:
        self._db = db
        self._clock = clock
        self._delay = simulator_delay

    async def __call__(self, hotel_ids: Sequence[UUID], key: str, tracer: Tracer) -> int:
        sent = 0
        async with self._db.unit_of_work() as uow:
            characteristic = await Registry(uow).get(key)
            text = str(characteristic.recipe.get("question") or characteristic.question or "")
            kind = str(characteristic.recipe.get("answer_kind", "free_text"))
            for hotel_id in hotel_ids:
                inserted = await uow.session.scalar(
                    insert(HotelierQuestion)
                    .values(
                        id=uuid4(),
                        hotel_id=hotel_id,
                        characteristic=key,
                        text=text or characteristic.title,
                        why=f"Гость ищет прямо сейчас: {characteristic.title.lower()}",
                        value=LIVE_QUESTION_VALUE,
                        answer_kind="choice" if kind == "yes_no" else kind,
                        options=["Да", "Нет"] if kind == "yes_no" else [],
                        context={"live": True},
                        run_id=tracer.run_id,
                        created_at=self._clock.now(),
                    )
                    .on_conflict_do_nothing(
                        index_elements=["hotel_id", "characteristic"],
                        index_where=sql_text("status = 'open'"),
                    )
                    .returning(HotelierQuestion.id)
                )
                sent += inserted is not None
                if self._delay is not None:
                    await schedule_simulation(uow, self._clock, hotel_id, self._delay)
        await tracer.tool(
            "hotelier.ask",
            summary=f"вопрос «{text or characteristic.title}» — {sent} отелям",
            args={"characteristic": key, "hotels": len(hotel_ids)},
        )
        return sent
