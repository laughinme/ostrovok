from collections.abc import Mapping, Sequence
from dataclasses import dataclass, replace
from uuid import UUID

from app.domain.knowledge.fact import Fact
from app.domain.search.intent import Chip, Importance, Intent
from app.domain.search.region import outside_region
from app.domain.search.score import Match, SearchHotel, TripWindow, Verdict, best_match

NO_MATCHES_HINT = (
    "По этим условиям вариантов пока нет. Попробуйте увеличить бюджет, "
    "уменьшить число гостей или выбрать другой район Большого Сочи."
)

GOOD_SCORE = 0.6
ENOUGH_GOOD = 5
RESEARCH_TOP = 8


@dataclass(frozen=True, slots=True)
class Relaxation:
    chip_id: str
    label: str
    would_match: int


@dataclass(frozen=True, slots=True)
class ResearchOffer:
    chip_id: str
    hotel_ids: tuple[UUID, ...]


@dataclass(frozen=True, slots=True)
class Ranking:
    matches: tuple[Match, ...]
    relaxations: tuple[Relaxation, ...]
    research: tuple[ResearchOffer, ...]


def result_hints(intent: Intent, ranking: Ranking) -> tuple[str, ...]:
    hints = list(intent.hints)
    if not ranking.matches and not outside_region(intent.text):
        hints.append(NO_MATCHES_HINT)
    if intent.trip.budget_per_night and any(m.hotel.price_from is None for m in ranking.matches):
        hints.append(
            "У части вариантов цена уточняется. Соответствие бюджету не подтверждено - "
            "уточните цену у отеля."
        )
    return tuple(dict.fromkeys(hints))


@dataclass(frozen=True, slots=True)
class Filters:
    budget_per_night: int | None = None
    guests: int | None = None


def _allowed(hotel: SearchHotel, filters: Filters) -> bool:
    if filters.guests and hotel.capacity < filters.guests:
        return False
    return not (
        filters.budget_per_night
        and hotel.price_from
        and hotel.price_from > filters.budget_per_night
    )


def _good(match: Match, chips: Sequence[Chip]) -> bool:
    musts = {c.id for c in chips if c.importance is Importance.MUST}
    broken = any(r.verdict is Verdict.NO and r.chip_id in musts for r in match.per_chip)
    return match.score >= GOOD_SCORE and not broken


def _ranked(
    chips: Sequence[Chip],
    hotels: Sequence[SearchHotel],
    facts: Mapping[UUID, Mapping[str, Sequence[Fact]]],
    trip: TripWindow,
    filters: Filters,
) -> list[Match]:
    matches = [
        best_match(chips, h, facts.get(h.id, {}), trip) for h in hotels if _allowed(h, filters)
    ]
    return sorted(matches, key=lambda m: (_good(m, chips), m.score, -m.risk), reverse=True)


def rank(
    chips: Sequence[Chip],
    hotels: Sequence[SearchHotel],
    facts: Mapping[UUID, Mapping[str, Sequence[Fact]]],
    trip: TripWindow,
    filters: Filters,
    *,
    limit: int = 30,
) -> Ranking:
    matches = _ranked(chips, hotels, facts, trip, filters)
    good = sum(1 for m in matches if _good(m, chips))
    relaxations: list[Relaxation] = []
    if good < ENOUGH_GOOD and chips:
        relaxations = _relaxations(chips, hotels, facts, trip, filters, good_now=good)
    return Ranking(
        matches=tuple(matches[:limit]),
        relaxations=tuple(relaxations),
        research=tuple(_research(chips, matches[:RESEARCH_TOP])),
    )


def _relaxations(
    chips: Sequence[Chip],
    hotels: Sequence[SearchHotel],
    facts: Mapping[UUID, Mapping[str, Sequence[Fact]]],
    trip: TripWindow,
    filters: Filters,
    *,
    good_now: int,
) -> list[Relaxation]:
    offers = []
    for chip in chips:
        rest = [c for c in chips if c.id != chip.id]
        if not rest:
            continue
        count = sum(1 for m in _ranked(rest, hotels, facts, trip, filters) if _good(m, rest))
        if count > good_now:
            offers.append(Relaxation(chip.id, chip.label, count))
    if filters.budget_per_night:
        loose = replace(filters, budget_per_night=None)
        count = sum(1 for m in _ranked(chips, hotels, facts, trip, loose) if _good(m, chips))
        if count > good_now:
            offers.append(Relaxation("budget", f"до {filters.budget_per_night} ₽", count))
    return sorted(offers, key=lambda r: -r.would_match)[:3]


def _research(chips: Sequence[Chip], top: Sequence[Match]) -> list[ResearchOffer]:
    offers = []
    for chip in chips:
        hotels = tuple(
            m.hotel.id
            for m in top
            if any(r.chip_id == chip.id and r.verdict is Verdict.UNKNOWN for r in m.per_chip)
        )
        if hotels:
            offers.append(ResearchOffer(chip.id, hotels))
    return offers
