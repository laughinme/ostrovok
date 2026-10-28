from dataclasses import asdict
from datetime import date, datetime
from typing import Any, Self
from uuid import UUID

from pydantic import Field

from app.api.schemas.base import ApiModel
from app.api.schemas.ground import ClimateOut, RouteOut
from app.api.schemas.knowledge import FactOut
from app.domain.booking.status import BookingStatus
from app.domain.geo.types import WalkProfile
from app.service.booking.models import Booking, BookingRequest
from app.service.booking.trips import Trip, TripSummary


class Guests(ApiModel):
    adults: int = Field(ge=1, le=20)
    children: int = Field(default=0, ge=0, le=20)


class BookingIn(ApiModel):
    hotel_id: UUID
    room_type_id: str = Field(min_length=1, max_length=64)
    rate_plan_id: str = Field(min_length=1, max_length=64)
    check_in: date
    check_out: date
    guests: Guests
    request: str | None = Field(default=None, max_length=4000)
    search_id: UUID | None = None

    def to_domain(self) -> BookingRequest:
        return BookingRequest(
            **self.model_dump(exclude={"guests"}, by_alias=False), **self.guests.model_dump()
        )


class BookingOut(ApiModel):
    id: UUID
    hotel_id: UUID
    room_type_id: str
    rate_plan_id: str
    check_in: date
    check_out: date
    guests: Guests
    request: str
    status: BookingStatus
    hotel_reply: str | None
    price_demo: int

    @classmethod
    def from_domain(cls, booking: Booking) -> Self:
        data = asdict(booking)
        return cls(
            **{k: v for k, v in data.items() if k not in {"adults", "children", "promised"}},
            guests=Guests(adults=booking.adults, children=booking.children),
        )


class TripSummaryOut(ApiModel):
    booking: BookingOut
    hotel_name: str
    hotel_area: str
    created_at: datetime

    @classmethod
    def from_summary(cls, trip: TripSummary) -> Self:
        return cls(
            booking=BookingOut.from_domain(trip.booking),
            hotel_name=trip.hotel_name,
            hotel_area=trip.hotel_area,
            created_at=trip.created_at,
        )


class SunsetOut(ApiModel):
    date: date
    at: datetime


class TripOut(ApiModel):
    booking: BookingOut
    promised: tuple[dict[str, Any], ...]
    facts: list[FactOut]
    climate: ClimateOut | None
    sunsets: list[SunsetOut]
    beach_route: RouteOut | None
    caveats: tuple[str, ...]

    @classmethod
    def from_trip(cls, trip: Trip) -> Self:
        hotel_id = trip.booking.hotel_id
        return cls(
            booking=BookingOut.from_domain(trip.booking),
            promised=trip.booking.promised,
            facts=[FactOut.from_domain(f) for f in trip.facts],
            climate=ClimateOut.from_climate(hotel_id, trip.climate) if trip.climate else None,
            sunsets=[SunsetOut(date=s.date, at=s.at) for s in trip.sunsets],
            beach_route=RouteOut.from_route(hotel_id, trip.beach_route, WalkProfile.WALK)
            if trip.beach_route
            else None,
            caveats=trip.caveats,
        )


class FeedbackItem(ApiModel):
    fact_id: UUID
    answer: bool


class FeedbackIn(ApiModel):
    answers: list[FeedbackItem] = Field(min_length=1, max_length=100)


class NotificationOut(ApiModel):
    id: UUID
    audience: str
    kind: str
    title: str
    body: str
    at: datetime
    read: bool
    link: str | None
