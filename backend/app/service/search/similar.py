import asyncio
from collections.abc import Mapping
from dataclasses import dataclass, replace
from enum import StrEnum
from functools import partial
from uuid import UUID

from app.db.uow import UnitOfWork
from app.domain.knowledge.characteristic import Checkable
from app.domain.knowledge.fact import Fact
from app.domain.search.intent import Chip, Importance, Intent
from app.domain.search.rank import Filters, rank
from app.domain.search.score import Match, best_match
from app.service.catalog.hotels import HotelNotFoundError
from app.service.ports import Clock
from app.service.search.candidates import load_candidates, load_facts
from app.service.search.search import trip_window


class Improvement(StrEnum):
    QUIETER = "quieter"
    CHEAPER = "cheaper"
    CLOSER_TO_BEACH = "closer_to_beach"


@dataclass(frozen=True, slots=True)
class SimilarHotels:
    source_id: UUID
    change: Improvement
    intent: Intent
    matches: tuple[Match, ...]
    caveats: tuple[str, ...] = ()


_TARGET = {
    Improvement.QUIETER: ("night_noise", "Тишина ночью"),
    Improvement.CLOSER_TO_BEACH: ("beach_walk", "Ближе к пляжу"),
}
_KEEP = {"sea_view", "sunset_over_sea", "mountain_view", "blackout", "ac"}


class SimilarService:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow, self._clock = uow, clock

    async def find(self, source_id: UUID, change: Improvement, intent: Intent) -> SimilarHotels:
        hotels = await load_candidates(self._uow)
        source = next((h for h in hotels if h.id == source_id), None)
        if source is None:
            raise HotelNotFoundError()
        intent = _similar_intent(intent, await self._uow.knowledge.facts([source_id]), change)
        chips = intent.chips
        facts = await load_facts(
            self._uow, [h.id for h in hotels], [c.characteristic for c in chips if c.characteristic]
        )
        baseline = best_match(chips, source, facts.get(source_id, {}), trip_window(intent))
        guests = (intent.trip.adults or 0) + (intent.trip.children or 0) or None
        ranking = await asyncio.to_thread(
            partial(
                rank,
                chips,
                hotels,
                facts,
                trip_window(intent),
                Filters(intent.trip.budget_per_night, guests),
                limit=len(hotels),
            )
        )
        by_id = {f.id: f for groups in facts.values() for values in groups.values() for f in values}
        matches = tuple(
            m
            for m in ranking.matches
            if m.hotel.id != source_id and _improves(m, baseline, change, by_id)
        )[:30]
        return SimilarHotels(
            source_id,
            change,
            intent,
            matches,
            () if matches else ("Нет варианта с подтверждённым улучшением по выбранному условию",),
        )


def _improves(
    candidate: Match, source: Match, change: Improvement, facts: Mapping[UUID, Fact]
) -> bool:
    if change is Improvement.CHEAPER:
        return (
            candidate.variant.price is not None
            and source.variant.price is not None
            and candidate.variant.price < source.variant.price
        )
    if change is Improvement.CLOSER_TO_BEACH:
        minutes, baseline = _minutes(candidate, facts), _minutes(source, facts)
        return minutes is not None and baseline is not None and minutes < baseline
    result = next((r for r in candidate.per_chip if r.chip_id == "improve"), None)
    original = next((r for r in source.per_chip if r.chip_id == "improve"), None)
    return (
        result is not None
        and result.probability is not None
        and (
            result.probability
            > (original.probability if original and original.probability is not None else 0.7)
        )
    )


def _minutes(match: Match, facts: Mapping[UUID, Fact]) -> float | None:
    result = next((r for r in match.per_chip if r.chip_id == "improve"), None)
    fact = facts.get(result.fact_id) if result and result.fact_id else None
    value = fact.value.get("minutes") if fact and isinstance(fact.value, Mapping) else None
    return float(value) if isinstance(value, int | float) else None


def _similar_intent(intent: Intent, source_facts: list[Fact], change: Improvement) -> Intent:
    chips = list(intent.chips)
    keys = {c.characteristic for c in chips}
    for fact in source_facts:
        if fact.characteristic in _KEEP and fact.value is True and fact.characteristic not in keys:
            keys.add(fact.characteristic)
            chips.append(
                Chip(
                    f"like:{fact.characteristic}",
                    fact.statement,
                    Importance.NICE,
                    Checkable.COMPUTE,
                    fact.characteristic,
                )
            )
    if change in _TARGET:
        key, title = _TARGET[change]
        chips = [c for c in chips if c.characteristic != key]
        chips.append(Chip("improve", title, Importance.MUST, Checkable.COMPUTE, key))
    return replace(intent, chips=tuple(chips))
