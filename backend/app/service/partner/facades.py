from collections.abc import Sequence
from dataclasses import dataclass
from datetime import timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import delete, select

from app.core.errors import DomainError
from app.db.models import FacadeRoom, RoomType
from app.db.uow import UnitOfWork
from app.domain.knowledge.observation import Evidence, EvidenceKind, Observation
from app.domain.knowledge.scope import Facade, Scope
from app.domain.knowledge.sources import SourceKind
from app.service.catalog.hotels import HotelNotFoundError
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import Registry
from app.service.knowledge.store import Recorded
from app.service.ports import Clock


@dataclass(frozen=True, slots=True)
class FacadeMapping:
    room_type_id: str
    facade: Facade
    floor_from: int
    floor_to: int

    def as_json(self) -> dict[str, Any]:
        return {
            "roomTypeId": self.room_type_id,
            "facade": self.facade.value,
            "floorFrom": self.floor_from,
            "floorTo": self.floor_to,
        }


class PartnerFacades:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow, self._clock = uow, clock

    async def replace(
        self,
        hotel_id: UUID,
        mappings: Sequence[FacadeMapping],
        *,
        is_demo: bool = False,
        source_ref: str = "hotel:facades",
    ) -> Recorded:
        await self._uow.knowledge.lock_pair(hotel_id, "partner_facades")
        await self._validate(hotel_id, mappings)
        await self._uow.session.execute(delete(FacadeRoom).where(FacadeRoom.hotel_id == hotel_id))
        for mark in dict.fromkeys(mappings):
            self._uow.session.add(
                FacadeRoom(
                    hotel_id=hotel_id,
                    room_type_id=mark.room_type_id,
                    facade=mark.facade.value,
                    floor_from=mark.floor_from,
                    floor_to=mark.floor_to,
                    confirmed_by_hotel=True,
                    updated_at=self._clock.now(),
                )
            )
        characteristic = await Registry(self._uow).get("facade_rooms")
        observation = Observation(
            hotel_id=hotel_id,
            characteristic="facade_rooms",
            characteristic_version=characteristic.version,
            scope=Scope.everywhere(),
            value={
                "mappings": [m.as_json() for m in mappings],
                "summary": "Отель подтвердил категории номеров по сторонам здания",
            },
            confidence=1.0,
            source=SourceKind.HOTELIER,
            source_ref=source_ref,
            method="Разметка фасадов отелем",
            observed_at=self._clock.now(),
            valid_until=self._clock.now() + timedelta(days=characteristic.ttl_days),
            is_demo=is_demo,
            evidence=(
                Evidence(
                    EvidenceKind.HOTELIER_ANSWER,
                    "Разметка категорий по сторонам и этажам",
                    "Демо-отельер" if is_demo else "Ответ отеля",
                ),
            ),
        )
        await self._uow.flush()
        return await KnowledgeStore(self._uow, self._clock).record(
            [observation], reason="Разметка фасадов отелем"
        )

    async def current(self, hotel_id: UUID) -> list[FacadeMapping]:
        rows = await self._uow.session.scalars(
            select(FacadeRoom).where(FacadeRoom.hotel_id == hotel_id)
        )
        return [
            FacadeMapping(r.room_type_id, Facade(r.facade), r.floor_from, r.floor_to) for r in rows
        ]

    async def _validate(self, hotel_id: UUID, mappings: Sequence[FacadeMapping]) -> None:
        hotel = await self._uow.catalog.hotel(hotel_id)
        if hotel is None:
            raise HotelNotFoundError()
        rooms = set(
            await self._uow.session.scalars(
                select(RoomType.id).where(RoomType.hotel_id == hotel_id)
            )
        )
        for mark in mappings:
            if mark.room_type_id not in rooms:
                raise DomainError("Категория номера не принадлежит отелю")
            if mark.facade.value not in hotel.facades:
                raise DomainError("У здания нет такой стороны")
            if not 1 <= mark.floor_from <= mark.floor_to <= hotel.floors:
                raise DomainError("Этажи разметки выходят за границы здания")
