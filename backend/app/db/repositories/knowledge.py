from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from sqlalchemy import cast, func, select, text, update
from sqlalchemy.dialects.postgresql import JSONB, distinct_on
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ConflictRow, FactRow, FactVersionRow, Hotel, ObservationRow
from app.domain.knowledge.fact import Fact, FactChange, FactStatus
from app.domain.knowledge.observation import Observation, evidence_from_json, evidence_to_json
from app.domain.knowledge.scope import Facade, Grid, scope_from_json, scope_to_json
from app.domain.knowledge.sources import SourceKind


def observation_from_row(row: ObservationRow) -> Observation:
    return Observation(
        id=row.id,
        hotel_id=row.hotel_id,
        characteristic=row.characteristic,
        characteristic_version=row.characteristic_version,
        scope=scope_from_json(row.scope),
        value=row.value,
        confidence=row.confidence,
        source=SourceKind(row.source),
        source_ref=row.source_ref,
        method=row.method,
        observed_at=row.observed_at,
        valid_until=row.valid_until,
        evidence=tuple(evidence_from_json(e) for e in row.evidence),
        caveats=tuple(row.caveats),
        run_id=row.run_id,
        is_demo=row.is_demo,
    )


def fact_from_row(row: FactRow) -> Fact:
    return Fact(
        id=row.id,
        hotel_id=row.hotel_id,
        characteristic=row.characteristic,
        scope=scope_from_json(row.scope),
        value=row.value,
        confidence=row.confidence,
        statement=row.statement,
        scope_text=row.scope_text,
        source=SourceKind(row.source),
        source_label=row.source_label,
        method=row.method,
        observed_at=row.observed_at,
        valid_until=row.valid_until,
        status=FactStatus(row.status),
        evidence=tuple(evidence_from_json(e) for e in row.evidence),
        caveats=tuple(row.caveats),
        observation_ids=tuple(row.observation_ids),
        conflict_id=row.conflict_id,
        is_demo=row.is_demo,
        version=row.version,
    )


def fact_to_row(fact: Fact, row: FactRow | None = None) -> FactRow:
    row = row or FactRow(id=fact.id)
    row.hotel_id = fact.hotel_id
    row.characteristic = fact.characteristic
    row.scope = scope_to_json(fact.scope)
    row.scope_key = fact.scope.key
    row.value = fact.value
    row.confidence = fact.confidence
    row.statement = fact.statement
    row.scope_text = fact.scope_text
    row.status = fact.status.value
    row.source = fact.source.value
    row.source_label = fact.source_label
    row.method = fact.method
    row.observed_at = fact.observed_at
    row.valid_until = fact.valid_until
    row.evidence = [evidence_to_json(e) for e in fact.evidence]
    row.caveats = list(fact.caveats)
    row.observation_ids = list(fact.observation_ids)
    row.conflict_id = fact.conflict_id
    row.is_demo = fact.is_demo
    row.version = fact.version
    return row


class KnowledgeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def lock_pair(self, hotel_id: UUID, characteristic: str) -> None:
        """Serializes reconciliation of one (hotel, characteristic) until the transaction ends."""
        await self._session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": f"{hotel_id}:{characteristic}"},
        )

    async def grid(self, hotel_id: UUID) -> Grid | None:
        row = (
            await self._session.execute(
                select(Hotel.facades, Hotel.floors).where(Hotel.id == hotel_id)
            )
        ).one_or_none()
        if row is None:
            return None
        return Grid(facades=tuple(Facade(f) for f in row.facades), floors=row.floors)

    async def add_observation(self, o: Observation, *, now: datetime) -> None:
        # The newer claim of the same source about the same scope replaces the older one.
        await self._session.execute(
            update(ObservationRow)
            .where(
                ObservationRow.hotel_id == o.hotel_id,
                ObservationRow.characteristic == o.characteristic,
                ObservationRow.source == o.source.value,
                ObservationRow.scope_key == o.scope.key,
                func.split_part(ObservationRow.source_ref, "@", 1) == o.source_key[1],
                ObservationRow.superseded_at.is_(None),
            )
            .values(superseded_at=now)
        )
        self._session.add(
            ObservationRow(
                id=o.id,
                hotel_id=o.hotel_id,
                characteristic=o.characteristic,
                characteristic_version=o.characteristic_version,
                scope=scope_to_json(o.scope),
                scope_key=o.scope.key,
                value=o.value,
                confidence=o.confidence,
                source=o.source.value,
                source_ref=o.source_ref,
                method=o.method,
                evidence=[evidence_to_json(e) for e in o.evidence],
                caveats=list(o.caveats),
                observed_at=o.observed_at,
                valid_until=o.valid_until,
                run_id=o.run_id,
                is_demo=o.is_demo,
            )
        )
        await self._session.flush()

    async def active_observations(self, hotel_id: UUID, characteristic: str) -> list[Observation]:
        rows = await self._session.scalars(
            select(ObservationRow).where(
                ObservationRow.hotel_id == hotel_id,
                ObservationRow.characteristic == characteristic,
                ObservationRow.superseded_at.is_(None),
            )
        )
        return [observation_from_row(r) for r in rows]

    async def observations(self, ids: Sequence[UUID]) -> list[Observation]:
        rows = await self._session.scalars(select(ObservationRow).where(ObservationRow.id.in_(ids)))
        return [observation_from_row(r) for r in rows]

    async def fact_rows(self, hotel_id: UUID, characteristic: str) -> list[FactRow]:
        rows = await self._session.scalars(
            select(FactRow).where(
                FactRow.hotel_id == hotel_id, FactRow.characteristic == characteristic
            )
        )
        return list(rows)

    async def facts(
        self, hotel_ids: Sequence[UUID], *, characteristic: str | None = None
    ) -> list[Fact]:
        stmt = select(FactRow).where(FactRow.hotel_id.in_(hotel_ids))
        if characteristic is not None:
            stmt = stmt.where(FactRow.characteristic == characteristic)
        rows = await self._session.scalars(stmt.order_by(FactRow.characteristic, FactRow.scope_key))
        return [fact_from_row(r) for r in rows]

    async def headlines(self, hotel_ids: Sequence[UUID]) -> list[Fact]:
        """One fact per (hotel, characteristic): the surest «yes», else the surest answer."""
        is_yes = FactRow.value == cast(True, JSONB)
        stmt = (
            select(FactRow)
            .where(FactRow.hotel_id.in_(hotel_ids))
            .ext(distinct_on(FactRow.hotel_id, FactRow.characteristic))
            .order_by(
                FactRow.hotel_id,
                FactRow.characteristic,
                is_yes.desc(),
                FactRow.confidence.desc(),
            )
        )
        return [fact_from_row(r) for r in await self._session.scalars(stmt)]

    async def fact(self, fact_id: UUID) -> Fact | None:
        row = await self._session.get(FactRow, fact_id)
        return fact_from_row(row) if row else None

    async def history(self, hotel_id: UUID, characteristic: str) -> list[FactChange]:
        rows = await self._session.scalars(
            select(FactVersionRow)
            .where(
                FactVersionRow.hotel_id == hotel_id,
                FactVersionRow.characteristic == characteristic,
            )
            .order_by(FactVersionRow.at)
        )
        return [
            FactChange(
                at=r.at,
                statement=r.statement,
                confidence=r.confidence,
                reason=r.reason,
                version=r.version,
            )
            for r in rows
        ]

    async def open_conflicts(self, hotel_id: UUID, characteristic: str) -> list[ConflictRow]:
        rows = await self._session.scalars(
            select(ConflictRow).where(
                ConflictRow.hotel_id == hotel_id,
                ConflictRow.characteristic == characteristic,
                ConflictRow.resolved_at.is_(None),
            )
        )
        return list(rows)
