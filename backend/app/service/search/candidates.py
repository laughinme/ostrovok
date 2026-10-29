from collections import defaultdict
from collections.abc import Sequence
from dataclasses import replace
from uuid import UUID

from sqlalchemy import select

from app.core.errors import DomainError
from app.db.models import FacadeRoom, RoomType
from app.db.repositories.catalog import hotel_geo
from app.db.uow import UnitOfWork
from app.domain.catalog import DISTRICT_TITLES
from app.domain.knowledge.fact import Fact
from app.domain.knowledge.scope import Facade, Scope
from app.domain.search.score import SearchHotel, Variant, default_variants


def _cheapest(rates: Sequence[dict[str, object]]) -> int | None:
    prices = [int(str(r.get("price", r.get("priceDemo", 0)))) for r in rates]
    return min((p for p in prices if p > 0), default=None)


async def load_candidates(
    uow: UnitOfWork, district: str | None = None, *, hotel_ids: Sequence[UUID] | None = None
) -> list[SearchHotel]:
    hotels = await uow.catalog.hotels(hotel_ids)
    if district:
        hotels = [h for h in hotels if h.district == district]
    rooms = (await uow.session.scalars(select(RoomType))).all()
    markup = (await uow.session.scalars(select(FacadeRoom))).all()
    rooms_by_hotel: dict[UUID, list[RoomType]] = defaultdict(list)
    for room in rooms:
        rooms_by_hotel[room.hotel_id].append(room)
    marks_by_room: dict[str, list[FacadeRoom]] = defaultdict(list)
    for mark in markup:
        marks_by_room[mark.room_type_id].append(mark)
    result = []
    for row in hotels:
        geo = hotel_geo(row)
        own_rooms = rooms_by_hotel.get(row.id, [])
        variants = [
            Variant(
                scope=Scope(
                    facades=frozenset({Facade(m.facade)}),
                    floor_from=m.floor_from,
                    floor_to=m.floor_to,
                ),
                room_type_id=room.id,
                room_name=room.name,
                confirmed_by_hotel=m.confirmed_by_hotel,
                price=_cheapest(room.rates),
            )
            for room in own_rooms
            for m in marks_by_room.get(room.id, [])
        ] or default_variants(geo.facades, geo.floors, row.price_from_demo)
        result.append(
            SearchHotel(
                id=row.id,
                name=row.name,
                area=DISTRICT_TITLES.get(row.district, row.district),
                district=row.district,
                location=(geo.location.lon, geo.location.lat),
                floors=geo.floors,
                facades=geo.facades,
                price_from=row.price_from_demo,
                capacity=max((r.capacity for r in own_rooms), default=4),
                variants=tuple(variants),
            )
        )
    return result


async def load_facts(
    uow: UnitOfWork, hotel_ids: Sequence[UUID], keys: Sequence[str]
) -> dict[UUID, dict[str, list[Fact]]]:
    result: dict[UUID, dict[str, list[Fact]]] = defaultdict(lambda: defaultdict(list))
    for key in set(keys):
        for fact in await uow.knowledge.facts(hotel_ids, characteristic=key):
            result[fact.hotel_id][key].append(fact)
    return result


async def with_room_variants(uow: UnitOfWork, hotel: SearchHotel, room_type_id: str) -> SearchHotel:
    if any(v.room_type_id == room_type_id for v in hotel.variants):
        return hotel
    room = await uow.session.get(RoomType, room_type_id)
    if room is None or room.hotel_id != hotel.id:
        raise DomainError("Категория не принадлежит выбранному отелю")
    variants = tuple(
        replace(v, room_type_id=room.id, room_name=room.name)
        for v in default_variants(hotel.facades, hotel.floors, _cheapest(room.rates))
    )
    return replace(hotel, variants=variants)
