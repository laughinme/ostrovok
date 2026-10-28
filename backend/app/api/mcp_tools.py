from collections.abc import Callable
from dataclasses import replace
from typing import Annotated, Any
from uuid import UUID

from pydantic import Field

from app.api.schemas.compare import CompareIn, CompareOut
from app.api.schemas.hotels import HotelOut
from app.api.schemas.knowledge import CharacteristicOut, FactDetailOut, FactOut
from app.api.schemas.search import HotelMatchOut, IntentChipModel, IntentModel, TripModel
from app.core.config import Settings
from app.db.database import Database
from app.domain.search.intent import Intent
from app.domain.search.trip import TripDraft
from app.service.catalog.hotels import HotelQueries
from app.service.knowledge.facts import FactQueries
from app.service.knowledge.registry import Registry
from app.service.ports import Clock
from app.service.search.compare import ComparisonService
from app.service.search.intents import IntentParser
from app.service.search.search import SearchService


class KnowledgeTools:
    def __init__(self, database: Callable[[], Database], settings: Settings, clock: Clock) -> None:
        self._database, self._data_dir, self._clock = database, settings.data_dir, clock

    async def search_hotels(
        self,
        text: Annotated[str, Field(max_length=2000)] = "",
        chips: list[IntentChipModel] | None = None,
        trip: TripModel | None = None,
        limit: Annotated[int, Field(ge=1, le=30)] = 10,
    ) -> dict[str, Any]:
        """Find hotels and room recommendations by wishes, e.g. sunset over the sea in November."""
        async with self._database().unit_of_work() as uow:
            intent = Intent(None, (), TripDraft(), ())
            if text and chips is None:
                intent = await IntentParser(uow, self._data_dir).parse(
                    text, today=self._clock.now().date()
                )
            if chips is not None:
                intent = replace(intent, chips=tuple(c.to_domain() for c in chips))
            if trip is not None:
                intent = replace(intent, trip=trip.to_domain())
            ranking = await SearchService(uow, self._clock).rank(intent)
        return {
            "intent": IntentModel.from_domain(intent).model_dump(mode="json"),
            "matches": [
                HotelMatchOut.from_domain(m).model_dump(mode="json")
                for m in ranking.matches[:limit]
            ],
        }

    async def get_hotel_knowledge(self, hotel_id: UUID) -> dict[str, Any]:
        """Read a hotel, its room categories and all scoped facts with evidence and uncertainty."""
        async with self._database().unit_of_work() as uow:
            hotel = await HotelQueries(uow).get(hotel_id)
            facts = await FactQueries(uow).of_hotel(hotel_id)
        return {
            "hotel": HotelOut.from_view(hotel).model_dump(mode="json"),
            "facts": [FactOut.from_domain(f).model_dump(mode="json") for f in facts],
        }

    async def explain_fact(self, fact_id: UUID) -> dict[str, Any]:
        """Explain a fact: source observations, method, evidence, caveats and version history."""
        async with self._database().unit_of_work() as uow:
            detail = await FactQueries(uow).detail(fact_id)
        return FactDetailOut.from_detail(detail).model_dump(mode="json")

    async def compare_hotels(self, payload: CompareIn) -> dict[str, Any]:
        """Compare 2–3 hotels or room variants for chips and trip dates, using the REST matrix."""
        async with self._database().unit_of_work() as uow:
            view = await ComparisonService(uow).compare(
                payload.intent(), [s.to_domain() for s in payload.selections]
            )
        return CompareOut.from_comparison(view).model_dump(mode="json")

    async def list_characteristics(self) -> dict[str, Any]:
        """List published characteristics, how they are checked, their keys and shelf lives."""
        async with self._database().unit_of_work() as uow:
            characteristics = await Registry(uow).all()
        return {
            "items": [
                CharacteristicOut.from_domain(c).model_dump(mode="json") for c in characteristics
            ]
        }
