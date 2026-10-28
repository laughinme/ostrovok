from uuid import UUID

from app.db.database import Database
from app.service.agents.runtime import Tracer
from app.service.partner.questions import PartnerQuestions, QuestionView
from app.service.ports import Clock


class Liaison:
    def __init__(self, db: Database, clock: Clock) -> None:
        self._db, self._clock = db, clock

    async def ask(self, hotel_id: UUID, tracer: Tracer) -> list[QuestionView]:
        await tracer.reason("Выбираю вопросы по спросу, неопределённости и влиянию на подбор")
        async with self._db.unit_of_work() as uow:
            questions = await PartnerQuestions(uow, self._clock).generate(
                hotel_id, run_id=tracer.run_id
            )
        await tracer.tool(
            "hotelier.ask",
            summary=f"Вопросов отелю: {len(questions)}",
            args={"hotelId": str(hotel_id)},
            output=[{"id": str(q.id), "value": q.value, "why": q.why} for q in questions],
        )
        await tracer.decide("Ждём ответ отеля; неуверенный разбор потребует уточнения")
        return questions
