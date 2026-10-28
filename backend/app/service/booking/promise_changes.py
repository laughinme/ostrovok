from uuid import UUID

from sqlalchemy import select

from app.db.database import Database
from app.db.models import BookingRow, NotificationRow
from app.domain.booking.scope import intersection
from app.domain.knowledge.fact import Fact
from app.domain.knowledge.scope import scope_from_json
from app.service.ports import Clock, EventBus

CONFIDENCE_DROP = 0.15


async def notify_changed_promises(
    db: Database, clock: Clock, events: EventBus, hotel_id: UUID, key: str
) -> None:
    recipients = []
    async with db.unit_of_work() as uow:
        bookings = (
            await uow.session.scalars(
                select(BookingRow)
                .where(
                    BookingRow.hotel_id == hotel_id,
                    BookingRow.check_out > clock.now().date(),
                    BookingRow.status.in_(["requested", "confirmed", "alternative_offered"]),
                )
                .with_for_update()
            )
        ).all()
        facts = await uow.knowledge.facts([hotel_id], characteristic=key)
        for booking in bookings:
            body = _change_body(booking, key, facts)
            if body is None:
                continue
            link = f"/trips/{booking.id}"
            exists = await uow.session.scalar(
                select(NotificationRow.id).where(
                    NotificationRow.user_id == booking.user_id,
                    NotificationRow.link == link,
                    NotificationRow.kind == "promise.changed",
                    NotificationRow.body == body,
                )
            )
            if exists:
                continue
            uow.session.add(
                NotificationRow(
                    audience="guest",
                    user_id=booking.user_id,
                    hotel_id=hotel_id,
                    kind="promise.changed",
                    title="Изменилось то, что мы обещали",
                    body=body,
                    link=link,
                )
            )
            recipients.append((booking.user_id, booking.id))
    for user_id, booking_id in recipients:
        await events.publish(
            f"user:{user_id}", {"type": "notification", "bookingId": str(booking_id)}
        )


def _change_body(booking: BookingRow, key: str, facts: list[Fact]) -> str | None:
    for promise in booking.promised:
        if promise["characteristic"] != key:
            continue
        scope = scope_from_json(promise["scope"])
        current = [f for f in facts if intersection(f.scope, scope)]
        changed = not current or any(
            f.value != promise["value"]
            or f.status.value != "ok"
            or f.confidence < float(promise["confidence"]) - CONFIDENCE_DROP
            for f in current
        )
        if changed:
            alternatives = [
                f
                for f in facts
                if f.value == promise["value"]
                and f.confidence >= float(promise["confidence"]) - CONFIDENCE_DROP
            ]
            alternative = (
                f" Можно запросить: {alternatives[0].scope_text}."
                if alternatives
                else (" Запросите у отеля альтернативный номер.")
            )
            return f"Раньше: {promise['statement']}. Новые данные требуют уточнения.{alternative}"
    return None
