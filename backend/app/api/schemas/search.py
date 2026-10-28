from datetime import date
from typing import Any, Literal, Self

from pydantic import Field

from app.api.schemas.base import ApiModel
from app.api.schemas.knowledge import ScopeOut
from app.domain.knowledge.characteristic import Checkable
from app.domain.search.intent import Chip, Importance, Intent
from app.domain.search.rank import Ranking
from app.domain.search.score import Match, request_text, variant_scope_text
from app.domain.search.trip import TripDraft
from app.service.search.search import SearchView


class IntentChipModel(ApiModel):
    id: str
    characteristic: str | None = None
    label: str = Field(..., min_length=1, max_length=120)
    importance: Importance = Importance.IMPORTANT
    checkable: Checkable = Checkable.COMPUTE
    params: dict[str, Any] = Field(default_factory=dict)
    from_profile: bool = False

    @classmethod
    def from_domain(cls, c: Chip) -> Self:
        return cls(
            id=c.id,
            characteristic=c.characteristic,
            label=c.label,
            importance=c.importance,
            checkable=c.checkable,
            params=dict(c.params),
            from_profile=c.from_profile,
        )

    def to_domain(self) -> Chip:
        return Chip(
            id=self.id,
            label=self.label,
            importance=self.importance,
            checkable=self.checkable,
            characteristic=self.characteristic,
            params=self.params,
            from_profile=self.from_profile,
        )


class TripModel(ApiModel):
    from_: date | None = Field(None, alias="from")
    to: date | None = None
    month: int | None = Field(None, ge=1, le=12)
    adults: int | None = Field(None, ge=1, le=10)
    children: int | None = Field(None, ge=0, le=10)
    budget_per_night: int | None = Field(None, ge=0)
    area: str | None = Field(
        None, description="center | khosta | adler | sirius | krasnaya_polyana"
    )

    @classmethod
    def from_domain(cls, t: TripDraft) -> Self:
        return cls.model_validate(
            {
                "from": t.check_in,
                "to": t.check_out,
                "month": t.month,
                "adults": t.adults,
                "children": t.children,
                "budgetPerNight": t.budget_per_night,
                "area": t.area,
            }
        )

    def to_domain(self) -> TripDraft:
        return TripDraft(
            check_in=self.from_,
            check_out=self.to,
            month=self.month,
            adults=self.adults,
            children=self.children,
            budget_per_night=self.budget_per_night,
            area=self.area,
        )


class IntentRequest(ApiModel):
    text: str = Field(..., min_length=1, max_length=2000)


class IntentModel(ApiModel):
    text: str | None = None
    chips: list[IntentChipModel]
    trip: TripModel
    hints: list[str] = Field(default_factory=list)
    planner: Literal["llm", "rules"] = "rules"

    @classmethod
    def from_domain(cls, i: Intent) -> Self:
        return cls(
            text=i.text,
            chips=[IntentChipModel.from_domain(c) for c in i.chips],
            trip=TripModel.from_domain(i.trip),
            hints=list(i.hints),
            planner="llm" if i.planner == "llm" else "rules",
        )


class SearchRequest(ApiModel):
    """Either text (parsed here) or the chips and trip of an edited intent canvas."""

    text: str | None = Field(None, max_length=2000)
    chips: list[IntentChipModel] | None = None
    trip: TripModel | None = None


class ChipResultOut(ApiModel):
    chip_id: str
    verdict: Literal["yes", "partial", "no", "unknown"]
    probability: float | None
    fact_id: str | None = None
    line: str


class RecommendationOut(ApiModel):
    room_type_id: str | None = None
    room_name: str | None = None
    scope: ScopeOut
    scope_text: str
    request: str
    confirmed_by_hotel: bool
    price_demo: int | None = None


class ThumbnailOut(ApiModel):
    kind: Literal["horizon", "facades", "map"]
    params: dict[str, Any]


class HotelMatchOut(ApiModel):
    hotel_id: str
    name: str
    area: str
    location: tuple[float, float]
    score: float
    disappointment_risk: float
    per_chip: list[ChipResultOut]
    tradeoff: str | None = None
    recommendation: RecommendationOut | None = None
    thumbnail: ThumbnailOut
    price_from_demo: int | None = None

    @classmethod
    def from_domain(cls, m: Match) -> Self:
        v = m.variant
        return cls(
            hotel_id=str(m.hotel.id),
            name=m.hotel.name,
            area=m.hotel.area,
            location=m.hotel.location,
            score=m.score,
            disappointment_risk=m.risk,
            per_chip=[
                ChipResultOut(
                    chip_id=r.chip_id,
                    verdict=r.verdict.value,
                    probability=r.probability,
                    fact_id=str(r.fact_id) if r.fact_id else None,
                    line=r.line,
                )
                for r in m.per_chip
            ],
            tradeoff=m.tradeoff,
            recommendation=RecommendationOut(
                room_type_id=v.room_type_id,
                room_name=v.room_name,
                scope=ScopeOut.from_domain(v.scope),
                scope_text=variant_scope_text(v),
                request=request_text(v),
                confirmed_by_hotel=v.confirmed_by_hotel,
                price_demo=v.price,
            ),
            thumbnail=ThumbnailOut(
                kind="facades",
                params={"facade": m.best_facade.value if m.best_facade else None},
            ),
            price_from_demo=m.hotel.price_from,
        )


class RelaxationOut(ApiModel):
    chip_id: str
    label: str
    would_match: int


class ResearchOut(ApiModel):
    chip_id: str
    hotel_ids: list[str]
    run_id: str | None = None


class SearchResultOut(ApiModel):
    search_id: str
    intent: IntentModel
    matches: list[HotelMatchOut]
    relaxations: list[RelaxationOut]
    research: list[ResearchOut]

    @classmethod
    def from_view(cls, view: SearchView) -> Self:
        ranking: Ranking = view.ranking
        return cls(
            search_id=str(view.id),
            intent=IntentModel.from_domain(view.intent),
            matches=[HotelMatchOut.from_domain(m) for m in ranking.matches],
            relaxations=[
                RelaxationOut(chip_id=r.chip_id, label=r.label, would_match=r.would_match)
                for r in ranking.relaxations
            ],
            research=[
                ResearchOut(chip_id=r.chip_id, hotel_ids=[str(h) for h in r.hotel_ids])
                for r in ranking.research
            ],
        )
