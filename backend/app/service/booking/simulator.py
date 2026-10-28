from uuid import UUID

from sqlalchemy import select

from app.db.database import Database
from app.db.models import BookingRow, FacadeRoom
from app.domain.booking.status import BookingStatus
from app.domain.knowledge.scope import scope_from_json
from app.domain.search.score import Variant, request_text
from app.service.booking.bookings import BookingService
from app.service.booking.promise_changes import notify_changed_promises
from app.service.ports import Clock, EventBus


class BookingSimulator:
    def __init__(self, db: Database, clock: Clock, events: EventBus) -> None:
        self._db, self._clock, self._events = db, clock, events

    async def respond(self, booking_id: UUID) -> None:
        async with self._db.unit_of_work() as uow:
            row = await uow.session.scalar(
                select(BookingRow).where(BookingRow.id == booking_id).with_for_update()
            )
            if row is None or row.status != BookingStatus.REQUESTED:
                return
            marks = (
                await uow.session.scalars(
                    select(FacadeRoom).where(
                        FacadeRoom.hotel_id == row.hotel_id,
                        FacadeRoom.room_type_id == row.room_type_id,
                        FacadeRoom.confirmed_by_hotel.is_(True),
                    )
                )
            ).all()
            scope = scope_from_json(row.promised[0]["bookingScope"]) if row.promised else None
            confirmed = bool(marks) and (
                scope is None
                or any(
                    (scope.facades is None or m.facade in scope.facades)
                    and m.floor_from <= (scope.floor_from or 1)
                    and m.floor_to >= (scope.floor_to or m.floor_to)
                    for m in marks
                )
            )
            if scope is not None and row.request != request_text(Variant(scope)):
                confirmed = False
            status = BookingStatus.CONFIRMED if confirmed else BookingStatus.ALTERNATIVE_OFFERED
            reply = (
                "Демо: категория и запрошенная область подтверждены по разметке отеля."
                if confirmed
                else (
                    "Демо: предлагаем выбранную категорию; сторону и этаж нужно уточнить у отеля."
                )
            )
            await BookingService(uow, self._clock).decide(booking_id, status, reply)
            user_id = row.user_id
        await self._events.publish(
            f"user:{user_id}",
            {
                "type": "notification",
                "bookingId": str(booking_id),
                "status": status.value,
            },
        )

    async def notify_changes(self, hotel_id: UUID, key: str) -> None:
        await notify_changed_promises(self._db, self._clock, self._events, hotel_id, key)
