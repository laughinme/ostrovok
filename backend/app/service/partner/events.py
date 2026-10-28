from collections.abc import Sequence
from uuid import UUID

from app.domain.knowledge.fact import Fact
from app.service.ports import EventBus


async def publish_partner_facts(events: EventBus, facts: Sequence[Fact]) -> None:
    for fact in facts:
        event = {
            "type": "fact.changed",
            "hotelId": str(fact.hotel_id),
            "factId": str(fact.id),
            "characteristic": fact.characteristic,
        }
        await events.publish(f"hotel:{fact.hotel_id}", event)
        await events.publish("facts", event)


async def publish_booking_decision(
    events: EventBus, guest_id: UUID, booking_id: UUID, status: str
) -> None:
    await events.publish(
        f"user:{guest_id}", {"type": "notification", "bookingId": str(booking_id), "status": status}
    )
