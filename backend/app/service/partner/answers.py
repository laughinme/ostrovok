from collections.abc import Mapping
from dataclasses import dataclass, replace
from datetime import timedelta
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select

from app.core.errors import ConflictError, DomainError
from app.db.models import HotelierAnswer, HotelierQuestion, RoomType
from app.db.uow import UnitOfWork
from app.domain.knowledge.characteristic import Characteristic
from app.domain.knowledge.fact import Fact
from app.domain.knowledge.observation import Evidence, EvidenceKind, Observation
from app.domain.knowledge.scope import Facade
from app.domain.knowledge.sources import SourceKind
from app.domain.partner.answers import AnswerInput, AnswerParser, ParsedAnswer
from app.domain.partner.rules import RulesAnswerParser
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import Registry
from app.service.partner.facades import FacadeMapping, PartnerFacades
from app.service.partner.questions import QuestionNotFoundError
from app.service.partner.scopes import resolve_scope
from app.service.ports import Clock


@dataclass(frozen=True, slots=True)
class AnswerResult:
    answer_id: UUID
    hotel_id: UUID
    parsed: ParsedAnswer
    changed: tuple[Fact, ...] = ()
    clarification: str | None = None


def answer_observation(
    hotel_id: UUID,
    c: Characteristic,
    parsed: ParsedAnswer,
    clock: Clock,
    *,
    source_ref: str,
    text: str,
    is_demo: bool,
) -> Observation:
    return Observation(
        hotel_id=hotel_id,
        characteristic=c.key,
        characteristic_version=c.version,
        scope=parsed.scope,
        value=parsed.value,
        confidence=parsed.confidence,
        source=SourceKind.HOTELIER,
        source_ref=source_ref,
        method=f"Ответ отеля · {parsed.parser}",
        observed_at=clock.now(),
        valid_until=clock.now() + timedelta(days=c.ttl_days),
        evidence=(
            Evidence(
                EvidenceKind.HOTELIER_ANSWER,
                text[:1000] or "Ответ в форме",
                "Демо-отельер" if is_demo else "Ответ отеля",
            ),
        ),
        is_demo=is_demo,
    )


class PartnerAnswers:
    def __init__(self, uow: UnitOfWork, clock: Clock, parser: AnswerParser | None = None) -> None:
        self._uow, self._clock = uow, clock
        self._parser = parser or RulesAnswerParser()

    async def submit(
        self,
        question_id: UUID,
        *,
        text: str = "",
        payload: Mapping[str, Any] | None = None,
        is_demo: bool = False,
    ) -> AnswerResult:
        question = await self._uow.session.scalar(
            select(HotelierQuestion).where(HotelierQuestion.id == question_id).with_for_update()
        )
        if question is None:
            raise QuestionNotFoundError()
        if question.status != "open":
            raise ConflictError("На вопрос уже ответили")
        c = await Registry(self._uow).get(question.characteristic)
        rooms = list(
            await self._uow.session.scalars(
                select(RoomType).where(RoomType.hotel_id == question.hotel_id)
            )
        )
        answer = AnswerInput(
            c.key,
            text,
            payload or {},
            tuple(r.name for r in rooms),
            tuple(question.options),
            c.value_type.value,
            c.unit,
        )
        parsed = await self._parser.parse(answer)
        parsed = _resolve_rooms(parsed, rooms)
        if not parsed.needs_clarification:
            try:
                parsed = replace(
                    parsed, scope=await resolve_scope(self._uow, question.hotel_id, parsed.scope)
                )
            except DomainError:
                parsed = replace(parsed, confidence=0.35)
        answer_id = uuid4()
        self._uow.session.add(
            HotelierAnswer(
                id=answer_id,
                question_id=question_id,
                hotel_id=question.hotel_id,
                text=text or None,
                payload=dict(payload or {}),
                parsed=dict(parsed.fields),
                parse_confidence=parsed.confidence,
                parser=parsed.parser,
                author="demo_hotelier" if is_demo else "hotelier",
                created_at=self._clock.now(),
            )
        )
        if parsed.needs_clarification:
            clarification = (
                "Уточните, пожалуйста, точные значения, категории номеров и этажи в форме ответа."
            )
            question.text = clarification
            question.context = {**question.context, "clarificationOf": str(answer_id)}
            await self._uow.flush()
            return AnswerResult(answer_id, question.hotel_id, parsed, clarification=clarification)
        changed = await self._record(question, c, parsed, text, is_demo)
        question.status, question.answered_at = "answered", self._clock.now()
        await self._uow.flush()
        return AnswerResult(answer_id, question.hotel_id, parsed, changed)

    async def _record(
        self,
        question: HotelierQuestion,
        c: Characteristic,
        parsed: ParsedAnswer,
        text: str,
        is_demo: bool,
    ) -> tuple[Fact, ...]:
        if c.key == "facade_rooms":
            mappings = facade_mappings(parsed)
            facades = PartnerFacades(self._uow, self._clock)
            if "mappings" not in parsed.fields:
                pairs = {(m.room_type_id, m.facade) for m in mappings}
                mappings = [
                    m
                    for m in await facades.current(question.hotel_id)
                    if (m.room_type_id, m.facade) not in pairs
                ] + mappings
            recorded = await facades.replace(question.hotel_id, mappings, is_demo=is_demo)
        else:
            observation = answer_observation(
                question.hotel_id,
                c,
                parsed,
                self._clock,
                source_ref=f"hotel:{question.hotel_id}:{c.key}",
                text=text,
                is_demo=is_demo,
            )
            recorded = await KnowledgeStore(self._uow, self._clock).record(
                [observation], reason="Ответ отельера"
            )
        return recorded.changed_facts


def _resolve_rooms(parsed: ParsedAnswer, rooms: list[RoomType]) -> ParsedAnswer:
    if not parsed.scope.room_types:
        return parsed
    ids = {r.name.casefold(): r.id for r in rooms} | {r.id: r.id for r in rooms}
    found = [ids.get(name.casefold()) for name in parsed.scope.room_types]
    if any(name is None for name in found):
        return replace(parsed, confidence=0.35)
    return replace(parsed, scope=replace(parsed.scope, room_types=frozenset(str(n) for n in found)))


def facade_mappings(parsed: ParsedAnswer) -> list[FacadeMapping]:
    raw = parsed.fields.get("mappings")
    if isinstance(raw, list):
        try:
            return [
                FacadeMapping(
                    str(m["roomTypeId"]),
                    Facade(m["facade"]),
                    int(m["floorFrom"]),
                    int(m["floorTo"]),
                )
                for m in raw
            ]
        except (KeyError, TypeError, ValueError) as exc:
            raise DomainError("Некорректная разметка фасадов") from exc
    low, high, side = (parsed.fields.get(k) for k in ("floor_from", "floor_to", "facade"))
    if not isinstance(low, int) or not isinstance(high, int) or side is None:
        raise DomainError("Укажите сторону и диапазон этажей")
    return [FacadeMapping(room, Facade(side), low, high) for room in parsed.scope.room_types or ()]
