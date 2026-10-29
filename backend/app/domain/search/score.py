from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from enum import StrEnum
from math import exp, isfinite, prod
from typing import Any
from uuid import UUID

from app.domain.knowledge.fact import Fact
from app.domain.knowledge.scope import MONTHS, Cell, Facade, Scope
from app.domain.knowledge.statements import FACADE_SHORT, scope_text
from app.domain.search.intent import WEIGHTS, Chip, Importance
from app.domain.search.scoped_facts import compatible_facts, specificity

UNKNOWN_PRIOR = 0.5
DEFAULT_WALK_MINUTES = 15.0


class Verdict(StrEnum):
    YES = "yes"
    PARTIAL = "partial"
    NO = "no"
    UNKNOWN = "unknown"


_SYMBOL = {Verdict.YES: "✓", Verdict.PARTIAL: "⚠", Verdict.NO: "✗", Verdict.UNKNOWN: "?"}


def verdict(p: float | None) -> Verdict:
    if p is None:
        return Verdict.UNKNOWN
    if p >= 0.7:
        return Verdict.YES
    if p >= 0.4:
        return Verdict.PARTIAL
    return Verdict.NO


@dataclass(frozen=True, slots=True)
class Variant:
    scope: Scope
    room_type_id: str | None = None
    room_name: str | None = None
    confirmed_by_hotel: bool = False
    price: int | None = None


@dataclass(frozen=True, slots=True)
class SearchHotel:
    id: UUID
    name: str
    area: str
    district: str
    location: tuple[float, float]
    floors: int
    facades: tuple[Facade, ...]
    price_from: int | None
    capacity: int
    variants: tuple[Variant, ...]


@dataclass(frozen=True, slots=True)
class ChipResult:
    chip_id: str
    verdict: Verdict
    probability: float | None
    fact_id: UUID | None
    line: str


@dataclass(frozen=True, slots=True)
class Match:
    hotel: SearchHotel
    variant: Variant
    score: float
    risk: float
    per_chip: tuple[ChipResult, ...]
    tradeoff: str | None
    best_facade: Facade | None = None


@dataclass(frozen=True, slots=True)
class TripWindow:
    months: frozenset[int] | None

    def month_set(self) -> frozenset[int]:
        return self.months or frozenset(MONTHS)


@dataclass(slots=True)
class HotelFacts:
    by_key: dict[str, list[Fact]] = field(default_factory=dict)


def floor_bands(floors: int) -> list[tuple[int, int]]:
    bands = [(1, min(3, floors))]
    if floors >= 4:
        bands.append((4, min(6, floors)))
    if floors >= 7:
        bands.append((7, floors))
    return bands


def default_variants(facades: Sequence[Facade], floors: int, price: int | None) -> list[Variant]:
    return [
        Variant(Scope(facades=frozenset({f}), floor_from=a, floor_to=b), price=price)
        for f in facades
        for a, b in floor_bands(floors)
    ]


def evaluate(
    chip: Chip, facts: Sequence[Fact], variant: Variant, hotel: SearchHotel, trip: TripWindow
) -> tuple[float | None, Fact | None]:
    if not chip.characteristic or not facts:
        return None, None
    facts = compatible_facts(facts, variant.scope, variant.room_type_id, trip.month_set())
    if not facts:
        return None, None
    sample = facts[0]
    if isinstance(sample.value, bool):
        return _probability_over_cells(chip, facts, variant, hotel, trip)
    return _record(chip, facts, trip)


def _cells(chip: Chip, variant: Variant, hotel: SearchHotel, trip: TripWindow) -> list[Cell]:
    scope = variant.scope
    facades = sorted(scope.facades or hotel.facades or (Facade.N,), key=list(Facade).index)
    low = max(scope.floor_from or 1, int(chip.params.get("minFloor", 1)))
    high = min(scope.floor_to or hotel.floors, hotel.floors)
    floors = range(low, max(low, high) + 1)
    return [Cell(f, fl, m) for f in facades for fl in floors for m in sorted(trip.month_set())]


def _probability_over_cells(
    chip: Chip, facts: Sequence[Fact], variant: Variant, hotel: SearchHotel, trip: TripWindow
) -> tuple[float | None, Fact | None]:
    total, counted = 0.0, 0
    coverage: dict[UUID, int] = {}
    for cell in _cells(chip, variant, hotel, trip):
        covering = [f for f in facts if f.scope.contains(cell)]
        if not covering:
            continue
        fact = max(covering, key=lambda f: (specificity(f), f.confidence))
        total += fact.confidence if fact.value else 1 - fact.confidence
        counted += 1
        coverage[fact.id] = coverage.get(fact.id, 0) + 1
    if counted == 0:
        return None, None
    main = max(coverage, key=lambda k: coverage[k])
    p = total / counted
    return (1 - p if chip.params.get("value") is False else p), next(
        f for f in facts if f.id == main
    )


def _record(
    chip: Chip, facts: Sequence[Fact], trip: TripWindow
) -> tuple[float | None, Fact | None]:
    fact = max(facts, key=lambda f: (_month_overlap(f, trip), specificity(f)))
    value: Mapping[str, Any] = fact.value if isinstance(fact.value, Mapping) else {}
    if "minutes" in value and value["minutes"] is not None:
        limit = float(chip.params.get("maxWalkMinutes", DEFAULT_WALK_MINUTES))
        p = fact.confidence / (1 + exp((float(value["minutes"]) - limit) / 2))
        if chip.params.get("noClimb") and (value.get("back_climb_m") or 0) > 15:
            p *= 0.4
        return min(0.98, p + (1 - fact.confidence) * 0.5 * (p > 0.5)), fact
    if "allowed" in value:
        weight = chip.params.get("dogWeightKg")
        ok = bool(value["allowed"]) and (
            weight is None or value.get("max_kg") is None or weight <= value["max_kg"]
        )
        return (fact.confidence if ok else 1 - fact.confidence), fact
    return fact.confidence, fact


def _month_overlap(fact: Fact, trip: TripWindow) -> int:
    months = fact.scope.months or frozenset(MONTHS)
    return len(months & trip.month_set())


def chip_weight(chip: Chip) -> float:
    weight = chip.params.get("profileWeight")
    if chip.from_profile and isinstance(weight, int | float) and isfinite(weight):
        return min(3.0, max(0.0, weight))
    return WEIGHTS[chip.importance]


def score_variant(
    chips: Sequence[Chip],
    hotel: SearchHotel,
    variant: Variant,
    facts: Mapping[str, Sequence[Fact]],
    trip: TripWindow,
) -> Match:
    results = []
    weighted, weights, must_factor = 0.0, 0.0, 1.0
    risk_terms = []
    for chip in chips:
        p, fact = evaluate(chip, facts.get(chip.characteristic or "", ()), variant, hotel, trip)
        weight = chip_weight(chip)
        value = UNKNOWN_PRIOR if p is None else p
        weighted += weight * value
        weights += weight
        if chip.importance is Importance.MUST:
            must_factor *= min(1.0, 0.5 + value)
        if chip.importance in (Importance.MUST, Importance.IMPORTANT):
            risk_terms.append(value)
        results.append(_result(chip, p, fact))
    score = (weighted / weights if weights else 0.5) * must_factor
    risk = 1 - prod(risk_terms) if risk_terms else 0.0
    return Match(
        hotel=hotel,
        variant=variant,
        score=round(score, 4),
        risk=round(risk, 4),
        per_chip=tuple(results),
        tradeoff=_tradeoff(chips, results),
        best_facade=next(iter(variant.scope.facades), None) if variant.scope.facades else None,
    )


def _result(chip: Chip, p: float | None, fact: Fact | None) -> ChipResult:
    v = verdict(p)
    if fact is None:
        line = f"? {chip.label.lower()}: пока не знаем" + (
            "" if chip.characteristic else " — можно узнать вживую"
        )
    else:
        statement = fact.statement[0].lower() + fact.statement[1:] if fact.statement else ""
        where = "" if fact.scope_text == "весь отель" else f" · {fact.scope_text}"
        line = f"{_SYMBOL[v]} {statement}{where}"
    return ChipResult(
        chip_id=chip.id,
        verdict=v,
        probability=round(p, 3) if p is not None else None,
        fact_id=fact.id if fact else None,
        line=line,
    )


def _tradeoff(chips: Sequence[Chip], results: Sequence[ChipResult]) -> str | None:
    weights = {c.id: chip_weight(c) for c in chips}
    weak = [r for r in results if r.verdict in (Verdict.PARTIAL, Verdict.NO)]
    if not weak:
        return None
    worst = max(weak, key=lambda r: (weights[r.chip_id], r.verdict is Verdict.NO))
    return worst.line


def best_match(
    chips: Sequence[Chip],
    hotel: SearchHotel,
    facts: Mapping[str, Sequence[Fact]],
    trip: TripWindow,
) -> Match:
    return max(
        (score_variant(chips, hotel, v, facts, trip) for v in hotel.variants),
        key=lambda m: (m.score, -m.risk),
    )


def request_text(variant: Variant) -> str:
    parts = []
    if variant.scope.facades:
        parts.append(
            ", ".join(FACADE_SHORT[f] for f in Facade if f in variant.scope.facades) + "-сторона"
        )
    if variant.scope.floor_from and variant.scope.floor_from > 1:
        parts.append(f"этаж ≥ {variant.scope.floor_from}")
    elif variant.scope.floor_to:
        parts.append(f"этаж ≤ {variant.scope.floor_to}")
    return " · ".join(parts) or "любой номер"


def variant_scope_text(variant: Variant) -> str:
    return scope_text(variant.scope)
