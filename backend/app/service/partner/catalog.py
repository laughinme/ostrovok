from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import select

from app.db.models import ConflictRow
from app.db.uow import UnitOfWork
from app.domain.knowledge.fact import Fact
from app.service.catalog.hotels import HotelQueries, HotelView
from app.service.knowledge.facts import FactQueries
from app.service.knowledge.registry import Registry


@dataclass(frozen=True, slots=True)
class PartnerConflict:
    id: UUID
    hotel_id: UUID
    characteristic: str
    claims: list[dict[str, Any]]
    rule: str
    resolution: str
    status: str
    question_id: UUID | None


@dataclass(frozen=True, slots=True)
class PartnerOverview:
    hotel: HotelView
    facts: tuple[Fact, ...]
    conflicts: tuple[PartnerConflict, ...]
    known: int
    total: int


class PartnerCatalog:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def overview(self, hotel_id: UUID) -> PartnerOverview:
        hotel = await HotelQueries(self._uow).get(hotel_id)
        facts = await FactQueries(self._uow).of_hotel(hotel_id)
        registry = {c.key: c for c in await Registry(self._uow).all()}
        rows = await self._uow.session.scalars(
            select(ConflictRow)
            .where(ConflictRow.hotel_id == hotel_id)
            .order_by(ConflictRow.created_at.desc())
        )
        conflicts = tuple(
            PartnerConflict(
                r.id,
                r.hotel_id,
                r.characteristic,
                [
                    {
                        **claim,
                        "statement": registry[r.characteristic].statement.render(
                            claim.get("value")
                        ),
                    }
                    for claim in r.claims
                ],
                r.rule,
                r.resolution,
                r.status,
                r.question_id,
            )
            for r in rows
        )
        return PartnerOverview(
            hotel,
            tuple(facts),
            conflicts,
            len({f.characteristic for f in facts} & registry.keys()),
            len(registry),
        )
