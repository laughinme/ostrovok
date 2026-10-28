from datetime import timedelta
from uuid import UUID

from app.db.uow import UnitOfWork
from app.domain.jobs import JobKind, NewJob
from app.domain.partner.simulator import demo_delay
from app.service.partner.questions import PartnerQuestions
from app.service.ports import Clock


async def schedule_simulation(
    uow: UnitOfWork, clock: Clock, hotel_id: UUID, delay_range: tuple[float, float]
) -> int:
    questions = await PartnerQuestions(uow, clock).of_hotel(hotel_id)
    scheduled = 0
    for question in questions:
        if question.status != "open":
            continue
        job_id = await uow.jobs.enqueue(
            NewJob(
                JobKind.HOTELIER_SIMULATE,
                {"question_id": str(question.id)},
                dedupe_key=f"hotelier:{question.id}",
                delay=timedelta(seconds=demo_delay(str(question.id), delay_range)),
            ),
            now=clock.now(),
        )
        scheduled += job_id
    return scheduled
