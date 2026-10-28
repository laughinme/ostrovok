from collections.abc import Sequence

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
