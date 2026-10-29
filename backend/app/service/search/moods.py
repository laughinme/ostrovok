import asyncio
from collections import defaultdict
from pathlib import Path
from uuid import UUID

import yaml
from sqlalchemy import or_, select

from app.db.models import FactRow
from app.db.uow import UnitOfWork
from app.domain.knowledge.characteristic import Checkable
from app.domain.knowledge.fact import Fact, FactStatus
from app.domain.knowledge.scope import Scope, scope_from_json
from app.domain.knowledge.sources import SourceKind
from app.domain.search.intent import Chip, Importance
from app.domain.search.moods import Mood, MoodCount, count_moods
from app.domain.search.score import TripWindow
from app.service.ports import Clock
from app.service.search.candidates import load_candidates


def load_moods(data_dir: Path) -> tuple[Mood, ...]:
    path = data_dir / "registry" / "moods.yaml"
    if not path.exists():
        return ()
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return tuple(
        Mood(
            id=m["id"],
            title=m["title"],
            description=m["description"],
            count_suffix=m["count_suffix"],
            chips=tuple(
                Chip(
                    id=f"{m['id']}-{i + 1}",
                    label=c["label"],
                    characteristic=c["characteristic"],
                    importance=Importance.MUST,
                    checkable=Checkable(c.get("checkable", "compute")),
                    params=c.get("params", {}),
                )
                for i, c in enumerate(m["chips"])
            ),
        )
        for m in raw["moods"]
    )


class MoodQueries:
    def __init__(self, uow: UnitOfWork, clock: Clock, data_dir: Path) -> None:
        self._uow, self._clock, self._data_dir = uow, clock, data_dir

    async def all(self, *, month: int | None = None) -> tuple[MoodCount, ...]:
        moods = load_moods(self._data_dir)
        if not moods:
            return ()
        hotels = await load_candidates(self._uow)
        keys = {c.characteristic for m in moods for c in m.chips if c.characteristic}
        facts = await self._facts([h.id for h in hotels], keys)
        return await asyncio.to_thread(
            count_moods,
            moods,
            hotels,
            facts,
            TripWindow(frozenset({month or self._clock.now().month})),
        )

    async def _facts(
        self, hotel_ids: list[UUID], keys: set[str]
    ) -> dict[UUID, dict[str, list[Fact]]]:
        rows = await self._uow.session.execute(
            select(
                FactRow.id,
                FactRow.hotel_id,
                FactRow.characteristic,
                FactRow.scope,
                FactRow.scope_key,
                FactRow.value,
                FactRow.confidence,
                FactRow.observed_at,
                FactRow.source,
                FactRow.valid_until,
            )
            .where(
                FactRow.hotel_id.in_(hotel_ids),
                FactRow.characteristic.in_(keys),
                FactRow.status == FactStatus.OK,
                or_(FactRow.valid_until.is_(None), FactRow.valid_until > self._clock.now()),
            )
            .order_by(FactRow.scope_key)
        )
        result: dict[UUID, dict[str, list[Fact]]] = defaultdict(lambda: defaultdict(list))
        scopes: dict[str, Scope] = {}
        for r in rows:
            if r.scope_key not in scopes:
                scopes[r.scope_key] = scope_from_json(r.scope)
            result[r.hotel_id][r.characteristic].append(
                Fact(
                    id=r.id,
                    hotel_id=r.hotel_id,
                    characteristic=r.characteristic,
                    scope=scopes[r.scope_key],
                    value=r.value,
                    confidence=r.confidence,
                    observed_at=r.observed_at,
                    valid_until=r.valid_until,
                    statement="",
                    scope_text="",
                    source=SourceKind(r.source),
                    source_label="",
                    method="",
                )
            )
        return result
