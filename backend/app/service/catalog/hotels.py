"""Hotel read models for the guest app: card, rooms, facts summary, what we do not know."""

from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import func, select

from app.core.errors import ErrorCode, NotFoundError
from app.db.models import FacadeRoom, FactRow, Hotel, RoomType
from app.db.repositories.catalog import hotel_geo
from app.db.uow import UnitOfWork
from app.domain.catalog import DISTRICT_TITLES, NEARBY_KINDS, HotelGeo, Nearby, nearby_places
from app.domain.knowledge.characteristic import Characteristic, CharacteristicStatus, MethodKind
from app.domain.knowledge.fact import Fact
from app.service.knowledge.facts import FactQueries, headline
from app.service.knowledge.registry import Registry

# Everything but beaches is looked up this close: the card lists walking-distance places.
_AROUND_M = 1200


class HotelNotFoundError(NotFoundError):
    error_code = ErrorCode.HOTEL_NOT_FOUND
    default_detail = "Hotel not found"


@dataclass(frozen=True, slots=True)
class RoomView:
    id: str
    name: str
    area: float
    bed: str
    capacity: int
    facades: tuple[str, ...]
    floors: tuple[int, int] | None
    confirmed_by_hotel: bool
    rates: list[dict[str, Any]]


@dataclass(frozen=True, slots=True)
class Unknown:
    characteristic: str
    question: str
    why: str


@dataclass(frozen=True, slots=True)
class HotelView:
    geo: HotelGeo
    stars: int | None
    address: str
    demo: dict[str, Any]
    price_from_demo: int | None
    rooms: tuple[RoomView, ...]
    facts: tuple[Fact, ...]
    unknowns: tuple[Unknown, ...]
    nearby: tuple[Nearby, ...] = ()

    @property
    def area(self) -> str:
        return DISTRICT_TITLES.get(self.geo.district, self.geo.district)


class HotelQueries:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def version(self) -> tuple[object, ...]:
        """Changes whenever the list would: a fact or a hotel is added, updated or removed."""
        row = (
            await self._uow.session.execute(
                select(
                    func.count(FactRow.id),
                    func.max(FactRow.updated_at),
                    select(func.count(Hotel.id)).scalar_subquery(),
                )
            )
        ).one()
        return tuple(row)

    async def many(self, ids: Sequence[UUID] | None = None) -> list[HotelView]:
        rows = await self._uow.catalog.hotels(ids)
        facts = await self._uow.knowledge.headlines([r.id for r in rows])
        by_hotel: dict[UUID, list[Fact]] = defaultdict(list)
        for fact in facts:
            by_hotel[fact.hotel_id].append(fact)
        return [
            HotelView(
                geo=hotel_geo(r),
                stars=r.stars,
                address=r.address or "",
                demo=r.demo,
                price_from_demo=r.price_from_demo,
                rooms=(),
                facts=tuple(_summary(by_hotel[r.id])),
                unknowns=(),
            )
            for r in rows
        ]

    async def get(self, hotel_id: UUID) -> HotelView:
        row = await self._uow.catalog.hotel(hotel_id)
        if row is None:
            raise HotelNotFoundError()
        facts = await FactQueries(self._uow).of_hotel(hotel_id)
        registry = await Registry(self._uow).all()
        geo = hotel_geo(row)
        return HotelView(
            geo=geo,
            stars=row.stars,
            address=row.address or "",
            demo=row.demo,
            price_from_demo=row.price_from_demo,
            rooms=tuple(await self._rooms(hotel_id)),
            facts=tuple(_summary(facts)),
            unknowns=tuple(_unknowns(registry, facts)),
            nearby=await self._nearby(geo),
        )

    async def _nearby(self, geo: HotelGeo) -> tuple[Nearby, ...]:
        reach = max(radius for _, _, radius in NEARBY_KINDS)
        beaches = await self._uow.catalog.features_near(geo.location, reach, kinds=["beach"])
        around = await self._uow.catalog.features_near(
            geo.location, _AROUND_M, kinds=["poi", "park", "station"]
        )
        return nearby_places(geo.location, [*beaches, *around])

    async def _rooms(self, hotel_id: UUID) -> list[RoomView]:
        rooms = (
            await self._uow.session.scalars(
                select(RoomType).where(RoomType.hotel_id == hotel_id).order_by(RoomType.position)
            )
        ).all()
        markup = (
            await self._uow.session.scalars(
                select(FacadeRoom).where(FacadeRoom.hotel_id == hotel_id)
            )
        ).all()
        sides: dict[str, list[FacadeRoom]] = defaultdict(list)
        for m in markup:
            sides[m.room_type_id].append(m)
        views = []
        for room in rooms:
            marks = sides.get(room.id, [])
            views.append(
                RoomView(
                    id=room.id,
                    name=room.name,
                    area=room.area,
                    bed=room.bed,
                    capacity=room.capacity,
                    facades=tuple(sorted({m.facade for m in marks})),
                    floors=(min(m.floor_from for m in marks), max(m.floor_to for m in marks))
                    if marks
                    else None,
                    confirmed_by_hotel=bool(marks) and all(m.confirmed_by_hotel for m in marks),
                    rates=room.rates,
                )
            )
        return views


def _summary(facts: Sequence[Fact]) -> list[Fact]:
    by_key: dict[str, list[Fact]] = defaultdict(list)
    for fact in facts:
        by_key[fact.characteristic].append(fact)
    return [headline(group) for _, group in sorted(by_key.items())]


def _unknowns(registry: Sequence[Characteristic], facts: Sequence[Fact]) -> list[Unknown]:
    known = {f.characteristic for f in facts}
    return [
        Unknown(
            characteristic=c.key,
            question=c.question or c.title,
            why="спросим отель" if c.method is MethodKind.ASK_HOTELIER else "ещё не посчитали",
        )
        for c in registry
        if c.key not in known and c.status is CharacteristicStatus.PUBLISHED
    ]
