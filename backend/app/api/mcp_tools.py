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
        limit: Annotated[int, Field(ge=1, le=30)] = 5,
    ) -> dict[str, Any]:
        """Подобрать отели Большого Сочи по пожеланиям: вердикты, factId и какой номер просить.

        Например: «тихий номер с закатом над морем в ноябре». Цены — демо, не наличие мест.
        Доказательства вердикта доступны через explain_fact(fact_id).
        """
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

    async def get_hotel_knowledge(
        self,
        hotel_id: UUID,
        offset: Annotated[int, Field(ge=0)] = 0,
        limit: Annotated[int, Field(ge=1, le=30)] = 10,
    ) -> dict[str, Any]:
        """Отель, демо-категории номеров и страница фактов: область, уверенность, источники.

        Для следующей страницы передайте nextOffset как offset. Геометрия доказательств
        опущена; explain_fact(fact_id) раскрывает метод, источники и подробности факта.
        """
        async with self._database().unit_of_work() as uow:
            hotel = await HotelQueries(uow).get(hotel_id)
            facts = await FactQueries(uow).of_hotel(hotel_id)
        return {
            "hotel": HotelOut.from_view(hotel, compact=True).model_dump(
                mode="json", exclude={"facts"}
            ),
            "facts": [
                FactOut.from_domain(f, compact=True).model_dump(
                    mode="json", exclude={"evidence": {"__all__": {"params", "osm_refs"}}}
                )
                for f in facts[offset : offset + limit]
            ],
            "totalFacts": len(facts),
            "nextOffset": offset + limit if offset + limit < len(facts) else None,
        }

    async def explain_fact(self, fact_id: UUID) -> dict[str, Any]:
        """Доказать факт по fact_id: наблюдения, метод, источники, оговорки и история версий."""
        async with self._database().unit_of_work() as uow:
            detail = await FactQueries(uow).detail(fact_id)
        return FactDetailOut.from_detail(detail).model_dump(mode="json")

    async def compare_hotels(self, payload: CompareIn) -> dict[str, Any]:
        """Сравнить 2–3 отеля или номера по пожеланиям и датам: вердикты и доказательства."""
        async with self._database().unit_of_work() as uow:
            view = await ComparisonService(uow).compare(
                payload.intent(), [s.to_domain() for s in payload.selections]
            )
        return CompareOut.from_comparison(view).model_dump(mode="json")

    async def list_characteristics(self) -> dict[str, Any]:
        """Что умеем проверять: ключи характеристик, методы, источники и сроки годности."""
        async with self._database().unit_of_work() as uow:
            characteristics = await Registry(uow).all()
        return {
            "items": [
                CharacteristicOut.from_domain(c).model_dump(mode="json") for c in characteristics
            ]
        }
