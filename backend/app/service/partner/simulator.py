from uuid import UUID

from sqlalchemy import select

from app.db.database import Database
from app.db.models import HotelierQuestion
from app.domain.agents import AgentKind, Planner
from app.domain.partner.simulator import simulate_answer
from app.service.agents.runtime import AgentRunner, Tracer, create_run
from app.service.partner.answers import PartnerAnswers
from app.service.partner.events import publish_partner_facts
from app.service.partner.truth import HiddenTruth
from app.service.ports import Clock, EventBus


class HotelierSimulator:
    def __init__(self, db: Database, clock: Clock, events: EventBus, truth: HiddenTruth) -> None:
        self._db, self._clock, self._events, self._truth = db, clock, events, truth

    async def respond(self, question_id: UUID) -> None:
        async with self._db.unit_of_work() as uow:
            question = await uow.session.get(HotelierQuestion, question_id)
            if question is None or question.status != "open":
                return
            hotel = await uow.catalog.hotel(question.hotel_id)
            profile = self._truth.profile(hotel.osm_id) if hotel else None
            if profile is None:
                return
            answer = simulate_answer(
                profile,
                question.characteristic,
                question_id=str(question_id),
                clarification="clarificationOf" in question.context,
            )
            if answer is None:
                return
            run_id = await create_run(
                uow,
                self._clock,
                agent=AgentKind.SIMULATOR,
                goal="Ответить от имени демо-отельера",
                planner=Planner.RULES,
                subject={"hotelIds": [str(question.hotel_id)]},
            )

        async def body(tracer: Tracer) -> None:
            async with self._db.unit_of_work() as uow:
                row = await uow.session.scalar(
                    select(HotelierQuestion)
                    .where(HotelierQuestion.id == question_id)
                    .with_for_update()
                )
                if row is None or row.status != "open":
                    return
                result = await PartnerAnswers(uow, self._clock).submit(
                    question_id, text=answer.text, payload=answer.payload, is_demo=True
                )
            await publish_partner_facts(self._events, result.changed)
            await tracer.tool(
                "answer.parse",
                summary="Ответ демо-отельера разобран",
                args={"questionId": str(question_id)},
                output={
                    "confidence": result.parsed.confidence,
                    "clarification": result.clarification,
                    "changed": len(result.changed),
                    "isDemo": True,
                },
            )

        await AgentRunner(self._db, self._events, self._clock).run(run_id, body)
