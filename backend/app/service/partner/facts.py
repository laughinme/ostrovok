from collections.abc import Mapping
from dataclasses import replace
from typing import Any
from uuid import UUID

from app.core.errors import DomainError
from app.db.uow import UnitOfWork
from app.domain.knowledge.scope import Scope
from app.domain.partner.answers import AnswerInput, AnswerParser, ParsedAnswer
from app.domain.partner.rules import RulesAnswerParser
from app.service.knowledge.facts import FactQueries
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import Registry
from app.service.knowledge.store import Recorded
from app.service.partner.answers import answer_observation, facade_mappings
from app.service.partner.facades import PartnerFacades
from app.service.partner.scopes import resolve_scope
from app.service.ports import Clock


class PartnerFacts:
    def __init__(self, uow: UnitOfWork, clock: Clock, parser: AnswerParser | None = None) -> None:
        self._uow, self._clock = uow, clock
        self._parser = parser or RulesAnswerParser()

    async def confirm(self, fact_id: UUID) -> Recorded:
        fact = (await FactQueries(self._uow).detail(fact_id)).fact
        return await self._record(
            fact_id,
            ParsedAnswer({"value": fact.value}, fact.value, 1.0, fact.scope),
            "Подтверждение факта отелем",
        )

    async def correct(
        self,
        fact_id: UUID,
        *,
        text: str = "",
        payload: Mapping[str, Any] | None = None,
        scope: Scope | None = None,
    ) -> Recorded:
        fact = (await FactQueries(self._uow).detail(fact_id)).fact
        c = await Registry(self._uow).get(fact.characteristic)
        parsed = await self._parser.parse(
            AnswerInput(
                c.key,
                text,
                payload or {},
                options=tuple(c.recipe.get("options", ())),
                value_type=c.value_type.value,
                unit=c.unit,
            )
        )
        if parsed.needs_clarification:
            raise DomainError(
                "Не удалось уверенно разобрать исправление. Укажите значение в форме."
            )
        parsed_scope = parsed.scope if parsed.scope != Scope() else fact.scope
        parsed = replace(parsed, scope=scope or parsed_scope)
        return await self._record(fact_id, parsed, text or "Исправление факта отелем")

    async def _record(self, fact_id: UUID, parsed: ParsedAnswer, text: str) -> Recorded:
        fact = (await FactQueries(self._uow).detail(fact_id)).fact
        c = await Registry(self._uow).get(fact.characteristic)
        if c.key == "facade_rooms":
            fields = parsed.value if isinstance(parsed.value, dict) else dict(parsed.fields)
            return await PartnerFacades(self._uow, self._clock).replace(
                fact.hotel_id, facade_mappings(replace(parsed, fields=fields))
            )
        parsed = replace(parsed, scope=await resolve_scope(self._uow, fact.hotel_id, parsed.scope))
        observation = answer_observation(
            fact.hotel_id,
            c,
            parsed,
            self._clock,
            source_ref=f"hotel:{fact.hotel_id}:{c.key}",
            text=text,
            is_demo=False,
        )
        return await KnowledgeStore(self._uow, self._clock).record([observation], reason=text)
