"""
Write path of the knowledge layer (09 §5.3): observations → Reconciler → facts, versions,
conflicts. One call is one transaction; each (hotel, characteristic) pair is locked while
it is reconciled, so concurrent agents never interleave their updates of the same pair.
"""

from collections import defaultdict
from collections.abc import Sequence
from dataclasses import replace
from datetime import datetime
from uuid import UUID, uuid4

from app.db.models import ConflictRow, FactRow, FactVersionRow
from app.db.repositories.knowledge import fact_to_row
from app.db.uow import UnitOfWork
from app.domain.knowledge.characteristic import Characteristic
from app.domain.knowledge.fact import Fact, FactStatus
from app.domain.knowledge.observation import Observation
from app.domain.knowledge.reconcile import ConflictDraft, FactDraft, reconcile
from app.domain.knowledge.scope import Grid
from app.domain.knowledge.sources import SourceKind, source_label
from app.domain.knowledge.statements import scope_text
from app.service.knowledge.registry import Registry
from app.service.knowledge.store import Recorded
from app.service.ports import Clock

# A version is written when the belief really moved, not on every recomputation.
_CONFIDENCE_STEP = 0.05
_FALLBACK_GRID = Grid(facades=(), floors=1)


class KnowledgeStore:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow = uow
        self._clock = clock
        self._registry = Registry(uow)

    async def record(
        self, observations: Sequence[Observation], *, reason: str, run_id: UUID | None = None
    ) -> Recorded:
        now = self._clock.now()
        pairs: dict[tuple[UUID, str], list[Observation]] = defaultdict(list)
        for o in observations:
            pairs[o.hotel_id, o.characteristic].append(o)
        changed: list[Fact] = []
        opened: list[UUID] = []
        for (hotel_id, key), batch in sorted(
            pairs.items(), key=lambda kv: (str(kv[0][0]), kv[0][1])
        ):
            facts, conflict_id = await self._record_pair(
                hotel_id, key, batch, reason=reason, run_id=run_id, now=now
            )
            changed.extend(facts)
            if conflict_id is not None:
                opened.append(conflict_id)
        return Recorded(changed_facts=tuple(changed), opened_conflicts=tuple(opened))

    async def reconcile_pair(self, hotel_id: UUID, key: str, *, reason: str) -> Recorded:
        """Recompute facts without new observations: after decay, a world change or a publish."""
        facts, conflict_id = await self._record_pair(
            hotel_id, key, [], reason=reason, run_id=None, now=self._clock.now()
        )
        return Recorded(
            changed_facts=tuple(facts), opened_conflicts=(conflict_id,) if conflict_id else ()
        )

    async def _record_pair(
        self,
        hotel_id: UUID,
        key: str,
        batch: Sequence[Observation],
        *,
        reason: str,
        run_id: UUID | None,
        now: datetime,
    ) -> tuple[list[Fact], UUID | None]:
        repo = self._uow.knowledge
        await repo.lock_pair(hotel_id, key)
        characteristic = await self._registry.get(key)
        for o in batch:
            await repo.add_observation(o, now=now)
        grid = await repo.grid(hotel_id) or _FALLBACK_GRID
        result = reconcile(characteristic, grid, await repo.active_observations(hotel_id, key), now)
        conflict_id = await self._apply_conflict(hotel_id, key, result.conflict, now)
        changed = await self._apply_facts(
            characteristic,
            hotel_id,
            result.facts,
            conflict_id=conflict_id,
            reason=reason,
            run_id=run_id,
            now=now,
        )
        return changed, conflict_id

    async def _apply_facts(
        self,
        characteristic: Characteristic,
        hotel_id: UUID,
        drafts: Sequence[FactDraft],
        *,
        conflict_id: UUID | None,
        reason: str,
        run_id: UUID | None,
        now: datetime,
    ) -> list[Fact]:
        existing = {
            row.scope_key: row
            for row in await self._uow.knowledge.fact_rows(hotel_id, characteristic.key)
        }
        changed = []
        for draft in drafts:
            row = existing.pop(draft.scope.key, None)
            fact = _fact(characteristic, hotel_id, draft, conflict_id=conflict_id, now=now, row=row)
            if row is not None and not _moved(row, fact):
                fact_to_row(fact, row)
                continue
            fact = _bump(fact, row)
            self._uow.session.add(fact_to_row(fact, row))
            self._uow.session.add(_version(fact, reason, run_id, now))
            changed.append(fact)
        for gone in existing.values():
            await self._uow.session.delete(gone)
        await self._uow.flush()
        return changed

    async def _apply_conflict(
        self, hotel_id: UUID, key: str, draft: ConflictDraft | None, now: datetime
    ) -> UUID | None:
        open_rows = await self._uow.knowledge.open_conflicts(hotel_id, key)
        if draft is None:
            for row in open_rows:
                row.status = "resolved"
                row.resolved_at = now
            return None
        row = (
            open_rows[0]
            if open_rows
            else ConflictRow(id=uuid4(), hotel_id=hotel_id, characteristic=key)
        )
        row.claims = [_claim(o) for o in draft.claims]
        row.rule = draft.rule.value
        row.resolution = draft.resolution
        row.cells = draft.cells
        row.status = "waiting_hotel" if draft.waits_for_hotel else "resolved"
        if not open_rows:
            self._uow.session.add(row)
        await self._uow.flush()
        return row.id


def _fact(
    characteristic: Characteristic,
    hotel_id: UUID,
    draft: FactDraft,
    *,
    conflict_id: UUID | None,
    now: datetime,
    row: FactRow | None,
) -> Fact:
    main = draft.main
    status = FactStatus.OK
    if draft.disputed:
        status = FactStatus.CONFLICT
    elif main.valid_until is not None and main.valid_until < now:
        status = FactStatus.STALE
    is_demo = main.is_demo or main.source is SourceKind.DEMO_CARD
    return Fact(
        id=row.id if row is not None else uuid4(),
        hotel_id=hotel_id,
        characteristic=characteristic.key,
        scope=draft.scope,
        value=draft.value,
        confidence=round(draft.confidence, 4),
        statement=characteristic.statement.render(draft.value),
        scope_text=scope_text(draft.scope),
        source=main.source,
        source_label=source_label(
            main.source, observed_at=main.observed_at, is_demo=is_demo, ref=main.source_ref
        ),
        method=main.method,
        observed_at=main.observed_at,
        valid_until=main.valid_until,
        status=status,
        evidence=main.evidence,
        caveats=tuple(dict.fromkeys((*characteristic.caveats, *main.caveats))),
        observation_ids=draft.observation_ids,
        conflict_id=conflict_id if draft.disputed else None,
        is_demo=is_demo,
        version=row.version if row is not None else 1,
    )


def _moved(row: FactRow, fact: Fact) -> bool:
    return (
        row.value != fact.value
        or abs(row.confidence - fact.confidence) >= _CONFIDENCE_STEP
        or row.status != fact.status.value
    )


def _bump(fact: Fact, row: FactRow | None) -> Fact:
    if row is None:
        return fact
    return replace(fact, version=row.version + 1)


def _version(fact: Fact, reason: str, run_id: UUID | None, now: datetime) -> FactVersionRow:
    return FactVersionRow(
        fact_id=fact.id,
        hotel_id=fact.hotel_id,
        characteristic=fact.characteristic,
        scope_key=fact.scope.key,
        version=fact.version,
        statement=f"{fact.statement} · {fact.scope_text}",
        value=fact.value,
        confidence=fact.confidence,
        reason=reason,
        run_id=run_id,
        at=now,
    )


def _claim(o: Observation) -> dict[str, object]:
    return {
        "observationId": str(o.id),
        "source": o.source.value,
        "label": source_label(
            o.source, observed_at=o.observed_at, is_demo=o.is_demo, ref=o.source_ref
        ),
        "value": o.value,
        "scopeText": scope_text(o.scope),
        "confidence": round(o.confidence, 3),
    }
