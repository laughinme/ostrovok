import json
from collections.abc import Mapping
from pathlib import Path
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import select

from app.db.database import Database
from app.db.models import HotelierQuestion
from app.domain.agents import AgentKind, Planner
from app.domain.partner.simulator import SimulatedAnswer, simulate_answer
from app.service.agents.runtime import AgentRunner, Tracer, create_run
from app.service.partner.answers import PartnerAnswers
from app.service.partner.events import publish_partner_facts
from app.service.partner.llm_answers import answer_parser
from app.service.partner.truth import HiddenTruth
from app.service.ports import Clock, EventBus, LanguageModel, LlmUnavailableError

PROMPT = Path(__file__).resolve().parents[1] / "agents" / "prompts" / "hotelier.md"


class PersonaReply(BaseModel):
    text: str = Field(max_length=600)


class HotelierSimulator:
    def __init__(
        self,
        db: Database,
        clock: Clock,
        events: EventBus,
        truth: HiddenTruth,
        llm: LanguageModel | None = None,
    ) -> None:
        self._db, self._clock, self._events, self._truth = db, clock, events, truth
        self._llm = llm

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
            voiced = self._llm is not None and self._llm.available and not answer.payload
            run_id = await create_run(
                uow,
                self._clock,
                agent=AgentKind.SIMULATOR,
                goal="Ответить от имени демо-отельера",
                planner=Planner.LLM if voiced else Planner.RULES,
                subject={"hotelIds": [str(question.hotel_id)]},
            )
            question_text, characteristic = question.text, question.characteristic
            draft = answer

        async def body(tracer: Tracer) -> None:
            reply = (
                await self._voice(draft, profile, characteristic, question_text, tracer)
                if voiced
                else draft
            )
            async with self._db.unit_of_work() as uow:
                row = await uow.session.scalar(
                    select(HotelierQuestion)
                    .where(HotelierQuestion.id == question_id)
                    .with_for_update()
                )
                if row is None or row.status != "open":
                    return
                result = await PartnerAnswers(uow, self._clock, answer_parser(self._llm)).submit(
                    question_id, text=reply.text, payload=reply.payload, is_demo=True
                )
            await publish_partner_facts(self._events, result.changed)
            await tracer.tool(
                "answer.parse",
                summary=f"Ответ демо-отельера разобран ({result.parsed.parser}): "
                f"«{reply.text[:160]}»",
                args={"questionId": str(question_id)},
                output={
                    "confidence": result.parsed.confidence,
                    "clarification": result.clarification,
                    "changed": len(result.changed),
                    "isDemo": True,
                },
            )

        await AgentRunner(self._db, self._events, self._clock).run(run_id, body)

    async def _voice(
        self,
        answer: SimulatedAnswer,
        profile: Mapping[str, Any],
        characteristic: str,
        question: str,
        tracer: Tracer,
    ) -> SimulatedAnswer:
        if self._llm is None:
            return answer
        truth = {
            "characteristic": characteristic,
            "truth": profile.get(characteristic),
            "claims": profile.get("claims", {}),
        }
        prompt = (
            f"Стиль отельера: {profile.get('persona', 'краткий')}\nВопрос: {question}\n"
            f"Правда об отеле: {json.dumps(truth, ensure_ascii=False, default=str)}\n"
            f"Черновик ответа: {answer.text}"
        )
        try:
            result = await self._llm.structured(
                task="hotelier",
                system=PROMPT.read_text(encoding="utf-8"),
                prompt=prompt,
                output=PersonaReply,
            )
        except LlmUnavailableError:
            return answer
        await tracer.llm("hotelier", result)
        return SimulatedAnswer(result.output.text.strip() or answer.text, answer.payload)
