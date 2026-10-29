from app.db.database import Database
from app.domain.partner.answers import ParsedAnswer
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import Registry
from app.service.partner.answers import answer_observation
from app.service.partner.questions import PartnerQuestions
from app.service.partner.truth import HiddenTruth
from app.service.ports import Clock


async def seed_demo_claims(db: Database, clock: Clock, truth: HiddenTruth) -> int:
    claimed = set(truth.claimed_hotels())
    written = 0
    async with db.unit_of_work() as uow:
        c = await Registry(uow).get("sea_view")
        for hotel in await uow.catalog.hotels():
            if hotel.osm_id not in claimed:
                continue
            await uow.knowledge.lock_pair(hotel.id, c.key)
            existing = await uow.knowledge.active_observations(hotel.id, c.key)
            if any(o.source_ref == f"demo:claim:{hotel.osm_id}" for o in existing):
                continue
            observation = answer_observation(
                hotel.id,
                c,
                ParsedAnswer({}, True, 0.98),
                clock,
                source_ref=f"demo:claim:{hotel.osm_id}",
                text="У нас все номера с видом на море!",
                is_demo=True,
            )
            await KnowledgeStore(uow, clock).record([observation], reason="Демо-заявление отельера")
            written += 1
    # Questions take a different lock, so keep their order independent of fact writes.
    async with db.unit_of_work() as uow:
        for hotel in await uow.catalog.hotels():
            if hotel.osm_id in claimed:
                await PartnerQuestions(uow, clock).generate(hotel.id)
    return written
