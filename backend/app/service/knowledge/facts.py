"""Read side of the knowledge layer (CQRS-lite, 09 §3.4): facts, «почему мы так думаем»."""

from collections.abc import Sequence
from dataclasses import dataclass
from uuid import UUID

from app.core.errors import ErrorCode, NotFoundError
from app.db.uow import UnitOfWork
from app.domain.knowledge.fact import Fact, FactChange
from app.domain.knowledge.observation import Observation
from app.domain.knowledge.values import probability_of_yes


class FactNotFoundError(NotFoundError):
    error_code = ErrorCode.FACT_NOT_FOUND
    default_detail = "Fact not found"


@dataclass(frozen=True, slots=True)
class FactDetail:
    fact: Fact
    sources: tuple[Observation, ...]
    history: tuple[FactChange, ...]


def breadth(fact: Fact) -> int:
    """How much of the hotel a fact covers, roughly: sides × floors × months."""
    scope = fact.scope
    sides = len(scope.facades) if scope.facades else 8
    floors = (scope.floor_to or 30) - (scope.floor_from or 1) + 1
    months = len(scope.months) if scope.months else 12
    return sides * floors * months


def headline(facts: Sequence[Fact]) -> Fact:
    """The one fact a summary shows: the best «yes» if there is one, else the surest answer;
    among equally sure ones, the one that covers more of the hotel."""
    positive = [f for f in facts if f.value is True]
    pool = positive or list(facts)
    return max(pool, key=lambda f: (round(f.confidence, 2), breadth(f)))


def yes_probability(fact: Fact) -> float | None:
    if isinstance(fact.value, bool):
        return probability_of_yes(fact.value, fact.confidence)
    return None


class FactQueries:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def of_hotel(self, hotel_id: UUID, characteristic: str | None = None) -> list[Fact]:
        return await self._uow.knowledge.facts([hotel_id], characteristic=characteristic)

    async def of_hotels(self, hotel_ids: Sequence[UUID]) -> list[Fact]:
        return await self._uow.knowledge.facts(hotel_ids)

    async def detail(self, fact_id: UUID) -> FactDetail:
        fact = await self._uow.knowledge.fact(fact_id)
        if fact is None:
            raise FactNotFoundError()
        sources = await self._uow.knowledge.observations(fact.observation_ids)
        others = [
            o
            for o in await self._uow.knowledge.active_observations(
                fact.hotel_id, fact.characteristic
            )
            if o.id not in fact.observation_ids
        ]
        history = await self._uow.knowledge.history(fact.hotel_id, fact.characteristic)
        scoped = [h for h in history if h.statement.endswith(fact.scope_text)] or history
        return FactDetail(
            fact=fact,
            sources=tuple(sorted([*sources, *others], key=lambda o: o.observed_at)),
            history=tuple(scoped),
        )
