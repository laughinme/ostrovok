"""Search (09 §7): intent → candidates → ranking. Searches are stored as intents and
re-ranked on every read, so a result reread after live research shows the new facts."""

import asyncio
from dataclasses import dataclass, replace
from datetime import date, timedelta
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.core.errors import ErrorCode, NotFoundError
from app.db.models import DemandDaily, SearchRow
from app.db.uow import UnitOfWork
from app.domain.search.intent import Intent
from app.domain.search.rank import Filters, Ranking, rank
from app.domain.search.score import TripWindow
from app.service.ports import Clock, LanguageModel
from app.service.search.candidates import load_candidates, load_facts
from app.service.search.explain import explain
from app.service.search.serialize import intent_from_json, intent_to_json
from app.service.search.taste import TasteService


class SearchNotFoundError(NotFoundError):
    error_code = ErrorCode.SEARCH_NOT_FOUND
    default_detail = "Search not found"


@dataclass(frozen=True, slots=True)
class SearchView:
    id: UUID
    intent: Intent
    ranking: Ranking


def trip_window(intent: Intent) -> TripWindow:
    trip = intent.trip
    if trip.check_in:
        end = (
            max(trip.check_in, trip.check_out - timedelta(days=1))
            if trip.check_out
            else trip.check_in
        )
        months: set[int] = set()
        cursor = date(trip.check_in.year, trip.check_in.month, 1)
        while cursor <= end:
            months.add(cursor.month)
            cursor = date(cursor.year + cursor.month // 12, cursor.month % 12 + 1, 1)
        return TripWindow(frozenset(months))
    return TripWindow(frozenset({trip.month}) if trip.month else None)


TOP_REMEMBERED = 20


def top_hotels(row: SearchRow) -> list[str] | None:
    """Hotels the guest saw at the top when the search was last ranked; None for old searches."""
    top = row.result.get("top")
    return list(top) if isinstance(top, list) else None


def _remember_top(row: SearchRow, ranking: Ranking) -> None:
    # Hotelier demand reads it later instead of re-ranking every search of the week.
    top = [str(m.hotel.id) for m in ranking.matches[:TOP_REMEMBERED]]
    row.result = {**row.result, "top": top}


class SearchService:
    def __init__(self, uow: UnitOfWork, clock: Clock, llm: LanguageModel | None = None) -> None:
        self._uow = uow
        self._clock = clock
        self._llm = llm

    async def search(
        self, intent: Intent, *, user_id: UUID | None = None, use_profile: bool = True
    ) -> SearchView:
        search_id = uuid4()
        row = SearchRow(
            id=search_id,
            user_id=user_id,
            intent=intent_to_json(intent),
            result={"useProfile": use_profile},
            created_at=self._clock.now(),
            updated_at=self._clock.now(),
        )
        self._uow.session.add(row)
        intent = await self._personalize(intent, user_id, use_profile)
        await self._count_demand(intent)
        ranking = await self.rank(intent)
        _remember_top(row, ranking)
        await self._uow.flush()
        return SearchView(search_id, intent, await explain(ranking, self._llm))

    async def intent(self, search_id: UUID) -> Intent:
        """The guest's wishes with their taste applied, without ranking every hotel."""
        row = await self._uow.session.get(SearchRow, search_id)
        if row is None:
            raise SearchNotFoundError()
        return await self._personalize(
            intent_from_json(row.intent), row.user_id, row.result.get("useProfile", True)
        )

    async def get(self, search_id: UUID) -> SearchView:
        row = await self._uow.session.get(SearchRow, search_id)
        if row is None:
            raise SearchNotFoundError()
        intent = await self._personalize(
            intent_from_json(row.intent), row.user_id, row.result.get("useProfile", True)
        )
        return SearchView(search_id, intent, await self.rank(intent))

    async def update_intent(self, search_id: UUID, intent: Intent) -> SearchView:
        row = await self._uow.session.get(SearchRow, search_id)
        if row is None:
            raise SearchNotFoundError()
        row.intent = intent_to_json(intent)
        row.updated_at = self._clock.now()
        await self._uow.flush()
        intent = await self._personalize(intent, row.user_id, row.result.get("useProfile", True))
        ranking = await self.rank(intent)
        _remember_top(row, ranking)
        return SearchView(search_id, intent, ranking)

    async def _personalize(self, intent: Intent, user_id: UUID | None, enabled: bool) -> Intent:
        intent = replace(intent, chips=tuple(c for c in intent.chips if not c.from_profile))
        if user_id is not None and enabled:
            return await TasteService(self._uow, self._clock).apply(intent, user_id)
        return intent

    async def rank(self, intent: Intent) -> Ranking:
        hotels = await load_candidates(self._uow, intent.trip.area)
        keys = [c.characteristic for c in intent.chips if c.characteristic]
        facts = await load_facts(self._uow, [h.id for h in hotels], keys)
        guests = (intent.trip.adults or 0) + (intent.trip.children or 0) or None
        filters = Filters(budget_per_night=intent.trip.budget_per_night, guests=guests)
        # Scoring every hotel is CPU work: off the event loop so other requests keep flowing.
        return await asyncio.to_thread(
            rank, intent.chips, hotels, facts, trip_window(intent), filters
        )

    async def _count_demand(self, intent: Intent) -> None:
        """What guests look for, per district and day: the Liaison's «спрос» (09 §4.4)."""
        day = self._clock.now().date()
        for chip in intent.chips:
            if not chip.characteristic:
                continue
            stmt = insert(DemandDaily).values(
                day=day,
                district=intent.trip.area or "all",
                characteristic=chip.characteristic,
                count=1,
            )
            await self._uow.session.execute(
                stmt.on_conflict_do_update(
                    index_elements=["day", "district", "characteristic"],
                    set_={"count": DemandDaily.count + 1},
                )
            )

    async def demand(self, district: str | None, *, days: int = 7) -> dict[str, int]:
        since = self._clock.now().date() - timedelta(days=days)
        stmt = (
            select(DemandDaily.characteristic, func.sum(DemandDaily.count))
            .where(DemandDaily.day >= since)
            .group_by(DemandDaily.characteristic)
        )
        if district:
            stmt = stmt.where(DemandDaily.district.in_([district, "all"]))
        rows: Any = (await self._uow.session.execute(stmt)).all()
        return {key: int(total) for key, total in rows}
