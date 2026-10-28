from typing import Self
from uuid import UUID

from pydantic import Field

from app.api.schemas.base import ApiModel
from app.api.schemas.search import (
    ChipResultOut,
    HotelMatchOut,
    IntentChipModel,
    IntentModel,
    TripModel,
)
from app.domain.knowledge.scope import Facade
from app.domain.search.compare import Selection
from app.domain.search.intent import Intent
from app.domain.search.trip import TripDraft
from app.service.search.compare import Comparison
from app.service.search.similar import Improvement, SimilarHotels


class SelectionIn(ApiModel):
    hotel_id: UUID
    room_type_id: str | None = None
    facade: Facade | None = None
    floor: int | None = Field(default=None, ge=1)

    def to_domain(self) -> Selection:
        return Selection(self.hotel_id, self.room_type_id, self.facade, self.floor)


class CompareIn(ApiModel):
    selections: list[SelectionIn] = Field(min_length=2, max_length=3)
    chips: list[IntentChipModel] = Field(default_factory=list, max_length=100)
    trip: TripModel | None = None

    def intent(self) -> Intent:
        return Intent(
            None,
            tuple(c.to_domain() for c in self.chips),
            self.trip.to_domain() if self.trip else TripDraft(),
            (),
        )


class ComparisonRow(ApiModel):
    chip_id: str
    label: str
    results: list[ChipResultOut]


class CompareOut(ApiModel):
    intent: IntentModel
    matches: list[HotelMatchOut]
    rows: list[ComparisonRow]
    summary: str

    @classmethod
    def from_comparison(cls, view: Comparison) -> Self:
        matches = [HotelMatchOut.from_domain(m) for m in view.matches]
        return cls(
            intent=IntentModel.from_domain(view.intent),
            matches=matches,
            rows=[
                ComparisonRow(chip_id=c.id, label=c.label, results=[m.per_chip[i] for m in matches])
                for i, c in enumerate(view.intent.chips)
            ],
            summary=view.summary,
        )


class SimilarIn(ApiModel):
    change: Improvement
    chips: list[IntentChipModel] = Field(default_factory=list, max_length=100)
    trip: TripModel | None = None

    def intent(self) -> Intent:
        return Intent(
            None,
            tuple(c.to_domain() for c in self.chips),
            self.trip.to_domain() if self.trip else TripDraft(),
            (),
        )


class SimilarOut(ApiModel):
    source_id: UUID
    change: Improvement
    intent: IntentModel
    matches: list[HotelMatchOut]
    caveats: tuple[str, ...]

    @classmethod
    def from_similar(cls, view: SimilarHotels) -> Self:
        return cls(
            source_id=view.source_id,
            change=view.change,
            intent=IntentModel.from_domain(view.intent),
            matches=[HotelMatchOut.from_domain(m) for m in view.matches],
            caveats=view.caveats,
        )
