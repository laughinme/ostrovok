from dataclasses import replace
from uuid import UUID

from sqlalchemy import select

from app.core.errors import DomainError
from app.db.models import RoomType
from app.db.uow import UnitOfWork
from app.domain.knowledge.scope import Scope
from app.service.catalog.hotels import HotelNotFoundError


async def resolve_scope(uow: UnitOfWork, hotel_id: UUID, scope: Scope) -> Scope:
    hotel = await uow.catalog.hotel(hotel_id)
    if hotel is None:
        raise HotelNotFoundError()
    if scope.facades and not scope.facades <= set(hotel.facades):
        raise DomainError("У здания нет указанной стороны")
    if (scope.floor_from or 1) > hotel.floors or (scope.floor_to or 1) > hotel.floors:
        raise DomainError("Область выходит за границы этажей здания")
    if scope.room_types:
        rooms = await uow.session.scalars(select(RoomType).where(RoomType.hotel_id == hotel_id))
        ids = {name.casefold(): r.id for r in rooms for name in (r.id, r.name)}
        resolved = [ids.get(name.casefold()) for name in scope.room_types]
        if any(room is None for room in resolved):
            raise DomainError("Категория номера не принадлежит отелю")
        scope = replace(scope, room_types=frozenset(str(room) for room in resolved))
    return scope
