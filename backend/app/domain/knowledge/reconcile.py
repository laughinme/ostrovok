"""
The Reconciler (09 §5.5): observations → per-cell beliefs → conflicts → facts.

Pure and deterministic. Facade characteristics are decided cell by cell over the hotel grid,
so «вид на море из всех номеров» (whole hotel) and «только ЮЗ с 4-го этажа» (computed)
are compared on the same cells; the answer is compressed back into a few scopes.
"""

from collections import defaultdict
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID

from app.domain.knowledge.characteristic import Characteristic
from app.domain.knowledge.confidence import Vote, decay, pool
from app.domain.knowledge.observation import Observation
from app.domain.knowledge.scope import Cell, Facade, Grid, Scope, compress
from app.domain.knowledge.sources import RELIABILITY, Authority, SourceKind
from app.domain.knowledge.values import ValueType, probability_of_yes

CONFIDENT_YES = 0.7
CONFIDENT_NO = 0.3
NUMBER_DISAGREEMENT = 0.5
GUESTS_NEEDED = 5
_BUCKET = 20  # facts group cells whose confidence differs by less than 0.05

_PHYSICAL = frozenset({SourceKind.COMPUTED, SourceKind.OPEN_DATA})

RESOLUTIONS: Mapping[Authority, str] = {
    Authority.PHYSICS: "Физика сильнее описания: показываем расчёт, отелю уходит уточняющий вопрос",
    Authority.HOTELIER: "Правила и оснащение знает отель: верим ответу отеля",
    Authority.FRESHEST: "Верим самому свежему наблюдению",
    Authority.GUESTS: "Решают отзывы гостей после поездки",
}


@dataclass(frozen=True, slots=True)
class FactDraft:
    scope: Scope
    value: Any
    confidence: float
    observation_ids: tuple[UUID, ...]
    main: Observation
    disputed: bool = False


@dataclass(frozen=True, slots=True)
class ConflictDraft:
    rule: Authority
    resolution: str
    claims: tuple[Observation, ...]
    cells: int
    facades: frozenset[Facade] = frozenset()

    @property
    def waits_for_hotel(self) -> bool:
        return self.rule is Authority.PHYSICS and any(
            c.source is SourceKind.HOTELIER for c in self.claims
        )


@dataclass(frozen=True, slots=True)
class Reconciled:
    facts: tuple[FactDraft, ...]
    conflict: ConflictDraft | None = None


@dataclass(slots=True)
class _CellBelief:
    value: bool
    confidence: float
    contributors: list[Observation] = field(default_factory=list)
    disputed: bool = False


def effective_confidence(observation: Observation, now: datetime) -> float:
    if observation.valid_until is None:
        return observation.confidence
    return decay(
        observation.confidence,
        observed_at=observation.observed_at,
        valid_until=observation.valid_until,
        now=now,
    )


def reconcile(
    characteristic: Characteristic,
    grid: Grid,
    observations: Sequence[Observation],
    now: datetime,
) -> Reconciled:
    if not observations:
        return Reconciled(facts=())
    if characteristic.value_type is ValueType.PROBABILITY:
        if characteristic.gridded:
            return _reconcile_grid(characteristic, grid, observations, now)
        return _reconcile_groups(characteristic, observations, now, _probability_group)
    return _reconcile_groups(characteristic, observations, now, _winner_group)


# ── probability over the grid ────────────────────────────────────────────


def _reconcile_grid(
    characteristic: Characteristic, grid: Grid, observations: Sequence[Observation], now: datetime
) -> Reconciled:
    covered = {o.id: set(o.scope.cells(grid)) for o in observations}
    beliefs: dict[Cell, _CellBelief] = {}
    disputed_by: dict[UUID, Observation] = {}
    for cell in grid.cells():
        here = [o for o in observations if cell in covered[o.id]]
        if not here:
            continue
        belief, disputes = _decide(characteristic.authority, here, now)
        beliefs[cell] = belief
        for o in disputes:
            disputed_by[o.id] = o

    keys = {
        cell: (b.value, round(b.confidence * _BUCKET), b.disputed) for cell, b in beliefs.items()
    }
    facts = []
    for scope, key in compress(keys, grid):
        cells = [c for c in scope.cells(grid) if keys.get(c) == key]
        facts.append(_draft(scope, [beliefs[c] for c in cells]))
    disputed_cells = [c for c, b in beliefs.items() if b.disputed]
    conflict = None
    if disputed_cells:
        conflict = ConflictDraft(
            rule=characteristic.authority,
            resolution=RESOLUTIONS[characteristic.authority],
            claims=tuple(disputed_by.values()),
            cells=len(disputed_cells),
            facades=frozenset(c.facade for c in disputed_cells),
        )
    return Reconciled(facts=tuple(facts), conflict=conflict)


def _decide(
    authority: Authority, here: Sequence[Observation], now: datetime
) -> tuple[_CellBelief, list[Observation]]:
    probabilities = {o.id: probability_of_yes(o.value, effective_confidence(o, now)) for o in here}
    yes = [o for o in here if probabilities[o.id] >= CONFIDENT_YES]
    no = [o for o in here if probabilities[o.id] <= CONFIDENT_NO]
    disputed = any(a.source != b.source for a in yes for b in no)
    voters = _by_rule(authority, here) if disputed else list(here)
    reliability = RELIABILITY[authority]
    p = pool(Vote(probabilities[o.id], reliability[o.source]) for o in voters)
    value = p >= 0.5
    agreeing = [o for o in voters if (probabilities[o.id] >= 0.5) == value] or voters
    return (
        _CellBelief(
            value=value,
            confidence=p if value else 1 - p,
            contributors=agreeing,
            disputed=disputed,
        ),
        [*yes, *no] if disputed else [],
    )


def _by_rule(authority: Authority, here: Sequence[Observation]) -> list[Observation]:
    match authority:
        case Authority.PHYSICS:
            chosen = [o for o in here if o.source in _PHYSICAL]
        case Authority.HOTELIER:
            chosen = [o for o in here if o.source is SourceKind.HOTELIER]
        case Authority.GUESTS:
            guests = [o for o in here if o.source is SourceKind.GUEST]
            chosen = guests if len(guests) >= GUESTS_NEEDED else list(here)
        case Authority.FRESHEST:
            chosen = [max(here, key=lambda o: o.observed_at)]
    return chosen or list(here)


def _draft(scope: Scope, cells: Sequence[_CellBelief]) -> FactDraft:
    contributors: dict[UUID, Observation] = {}
    for belief in cells:
        for o in belief.contributors:
            contributors[o.id] = o
    main = max(contributors.values(), key=lambda o: (o.source in _PHYSICAL, o.confidence))
    return FactDraft(
        scope=scope,
        value=cells[0].value,
        confidence=sum(b.confidence for b in cells) / len(cells),
        observation_ids=tuple(contributors),
        main=main,
        disputed=any(b.disputed for b in cells),
    )


# ── everything else: grouped by the scope each source spoke about ───────


def _reconcile_groups(
    characteristic: Characteristic,
    observations: Sequence[Observation],
    now: datetime,
    decide: Any,
) -> Reconciled:
    groups: dict[str, list[Observation]] = defaultdict(list)
    for o in observations:
        groups[o.scope.key].append(o)
    facts: list[FactDraft] = []
    claims: dict[UUID, Observation] = {}
    for group in groups.values():
        draft, disputes = decide(characteristic.authority, group, now)
        facts.append(draft)
        claims.update((o.id, o) for o in disputes)
    conflict = None
    if claims:
        conflict = ConflictDraft(
            rule=characteristic.authority,
            resolution=RESOLUTIONS[characteristic.authority],
            claims=tuple(claims.values()),
            cells=sum(1 for f in facts if f.disputed),
        )
    return Reconciled(facts=tuple(facts), conflict=conflict)


def _probability_group(
    authority: Authority, group: Sequence[Observation], now: datetime
) -> tuple[FactDraft, list[Observation]]:
    belief, disputes = _decide(authority, group, now)
    return _draft(group[0].scope, [belief]), disputes


def _winner_group(
    authority: Authority, group: Sequence[Observation], now: datetime
) -> tuple[FactDraft, list[Observation]]:
    reliability = RELIABILITY[authority]
    if authority is Authority.FRESHEST:
        winner = max(group, key=lambda o: o.observed_at)
    else:
        winner = max(
            group,
            key=lambda o: (reliability[o.source] * effective_confidence(o, now), o.observed_at),
        )
    disputes = [o for o in group if o.source != winner.source and _disagree(o.value, winner.value)]
    draft = FactDraft(
        scope=winner.scope,
        value=winner.value,
        confidence=effective_confidence(winner, now),
        observation_ids=(winner.id,),
        main=winner,
        disputed=bool(disputes),
    )
    return draft, [winner, *disputes] if disputes else []


def _disagree(a: Any, b: Any) -> bool:
    x, y = _headline(a), _headline(b)
    if isinstance(x, int | float) and isinstance(y, int | float):
        top = max(abs(x), abs(y))
        return top > 0 and abs(x - y) / top > NUMBER_DISAGREEMENT
    return x != y if x is not None and y is not None else False


def _headline(value: Any) -> Any:
    """The number a person would compare: minutes for routes, the value itself otherwise."""
    if isinstance(value, Mapping):
        for name in ("minutes", "value", "allowed"):
            if name in value:
                return value[name]
        return None
    return value


def observed_scopes(observations: Iterable[Observation]) -> set[str]:
    return {o.scope.key for o in observations}
