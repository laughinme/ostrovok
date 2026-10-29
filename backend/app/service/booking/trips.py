from dataclasses import dataclass
from datetime import date, datetime, timedelta
from uuid import UUID

from sqlalchemy import select

from app.core.errors import NotFoundError
from app.db.models import BookingRow, Hotel, UserEventRow
from app.db.uow import UnitOfWork
from app.domain.booking.scope import intersection
from app.domain.catalog import DISTRICT_TITLES
from app.domain.geo.sun import sun_events
from app.domain.geo.types import WalkProfile
from app.domain.knowledge.fact import Fact
from app.domain.knowledge.scope import scope_from_json
from app.service.booking.bookings import booking_view, owned_booking
from app.service.booking.models import Booking
from app.service.catalog.hotels import HotelQueries
from app.service.geo.climate import TripClimate, hotel_climate
from app.service.geo.routes import RouteView, hotel_route
from app.service.knowledge.facts import FactQueries
from app.service.recipes.executor import Environment


@dataclass(frozen=True, slots=True)
class Sunset:
    date: date
    at: datetime


@dataclass(frozen=True, slots=True)
class Trip:
    booking: Booking
    facts: tuple[Fact, ...]
    climate: TripClimate | None
    sunsets: tuple[Sunset, ...]
    beach_route: RouteView | None
    caveats: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class TripSummary:
    booking: Booking
    hotel_name: str
    hotel_area: str
    created_at: datetime


async def guest_trips(uow: UnitOfWork, user_id: UUID, limit: int) -> list[TripSummary]:
    rows = await uow.session.execute(
        select(BookingRow, Hotel.name, Hotel.district)
        .join(Hotel, Hotel.id == BookingRow.hotel_id)
        .where(BookingRow.user_id == user_id)
        .order_by(BookingRow.created_at.desc())
        .limit(limit)
    )
    return [
        TripSummary(
            booking_view(row), name, DISTRICT_TITLES.get(district, district), row.created_at
        )
        for row, name, district in rows
    ]


class TripQueries:
    def __init__(self, uow: UnitOfWork, env: Environment) -> None:
        self._uow, self._env = uow, env

    async def get(self, booking_id: UUID, user_id: UUID) -> Trip:
        row = await owned_booking(self._uow, booking_id, user_id)
        hotel = await HotelQueries(self._uow).get(row.hotel_id)
        event = await self._uow.session.scalar(
            select(UserEventRow).where(
                UserEventRow.user_id == user_id,
                UserEventRow.kind == "booking_requested",
                UserEventRow.payload["bookingId"].astext == str(booking_id),
            )
        )
        scopes = (
            [scope_from_json(event.payload["scope"])]
            if event
            else [scope_from_json(p["bookingScope"]) for p in row.promised]
        )
        facts = await FactQueries(self._uow).of_hotel(row.hotel_id)
        relevant = tuple(f for f in facts if any(intersection(f.scope, s) for s in scopes))
        climate = (
            hotel_climate(hotel.geo, self._env, row.check_in, row.check_out)
            if self._env.climate
            else None
        )
        try:
            beach = await hotel_route(hotel.geo, self._env, "beach", WalkProfile.WALK)
        except NotFoundError:
            beach = None
        sunsets = tuple(
            Sunset(day, sun_events(hotel.geo.location, day).sunset.at)
            for day in (
                row.check_in + timedelta(days=i) for i in range((row.check_out - row.check_in).days)
            )
        )
        return Trip(
            booking_view(row),
            relevant,
            climate,
            sunsets,
            beach,
            ("Время астрономического заката; видимость из окна зависит от фасада и препятствий",),
        )
