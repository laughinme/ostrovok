from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select

from app.db.models import BookingRow, NotificationRow
from app.db.uow import UnitOfWork
from app.domain.booking.status import BookingStatus
from app.service.booking.bookings import BookingService, booking_view
from app.service.booking.models import Booking, BookingNotFoundError, Notification
from app.service.ports import Clock


@dataclass(frozen=True, slots=True)
class PartnerDecision:
    booking: Booking
    guest_id: UUID


class PartnerRequests:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow, self._clock = uow, clock

    async def of_hotel(self, hotel_id: UUID) -> list[Booking]:
        rows = await self._uow.session.scalars(
            select(BookingRow)
            .where(BookingRow.hotel_id == hotel_id)
            .order_by(BookingRow.created_at.desc(), BookingRow.id)
        )
        return [booking_view(row) for row in rows]

    async def decide(self, booking_id: UUID, status: BookingStatus, reply: str) -> PartnerDecision:
        booking = await BookingService(self._uow, self._clock).decide(booking_id, status, reply)
        row = await self._uow.session.get(BookingRow, booking_id)
        if row is None:
            raise BookingNotFoundError()
        return PartnerDecision(booking, row.user_id)


async def hotel_notifications(uow: UnitOfWork, hotel_id: UUID) -> list[Notification]:
    rows = await uow.session.scalars(
        select(NotificationRow)
        .where(NotificationRow.hotel_id == hotel_id, NotificationRow.audience == "hotel")
        .order_by(NotificationRow.created_at.desc(), NotificationRow.id)
        .limit(100)
    )
    return [
        Notification(
            r.id, r.audience, r.kind, r.title, r.body, r.created_at, r.read_at is not None, r.link
        )
        for r in rows
    ]
