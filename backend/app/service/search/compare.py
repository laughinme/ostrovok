from collections.abc import Sequence
from dataclasses import dataclass, replace

from app.core.errors import DomainError
from app.db.uow import UnitOfWork
from app.domain.search.compare import Selection, comparison_summary, validate_selections
from app.domain.search.intent import Intent
from app.domain.search.score import Match, best_match
from app.service.catalog.hotels import HotelNotFoundError
from app.service.search.candidates import load_candidates, load_facts, with_room_variants
from app.service.search.search import trip_window


@dataclass(frozen=True, slots=True)
class Comparison:
    intent: Intent
    matches: tuple[Match, ...]
    summary: str


class ComparisonService:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def compare(self, intent: Intent, selections: Sequence[Selection]) -> Comparison:
        validate_selections(selections)
        hotels = {h.id: h for h in await load_candidates(self._uow)}
        facts = await load_facts(
            self._uow,
            [s.hotel_id for s in selections],
            [c.characteristic for c in intent.chips if c.characteristic],
        )
        matches = []
        for selection in selections:
            hotel = hotels.get(selection.hotel_id)
            if hotel is None:
                raise HotelNotFoundError()
            if selection.room_type_id:
                hotel = await with_room_variants(self._uow, hotel, selection.room_type_id)
            variants = selection.variants(hotel.variants)
            if not variants:
                raise DomainError("Категория, фасад или этаж не соответствуют выбранному отелю")
            matches.append(
                best_match(
                    intent.chips,
                    replace(hotel, variants=variants),
                    facts.get(hotel.id, {}),
                    trip_window(intent),
                )
            )
        return Comparison(intent, tuple(matches), comparison_summary(matches, intent.chips))
