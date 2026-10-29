import asyncio
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Request, Response
from pydantic import TypeAdapter

from app.api.deps import FactQueriesDep, HotelQueriesDep
from app.api.schemas.hotels import HotelOut
from app.api.schemas.knowledge import FactDetailOut, FactOut
from app.api.v1.window import router as window_router
from app.service.catalog.hotels import HotelQueries, HotelView

router = APIRouter(tags=["Hotels"])
router.include_router(window_router)


_HOTELS = TypeAdapter(list[HotelOut])


class HotelListCache:
    def __init__(self) -> None:
        self._version: tuple[object, ...] | None = None
        self._body = b""
        self._lock = asyncio.Lock()

    async def body(self, svc: HotelQueries) -> bytes:
        version = await svc.version()
        if version != self._version:
            async with self._lock:
                if version != self._version:
                    views = await svc.many()
                    self._body = await asyncio.to_thread(_dump, views)
                    self._version = version
        return self._body


def _dump(views: list[HotelView]) -> bytes:
    return _HOTELS.dump_json([HotelOut.from_view(h, compact=True) for h in views], by_alias=True)


@router.get(
    path="/hotels",
    summary="Hotels of the region with a summary of what we know",
    response_model=list[HotelOut],
)
async def list_hotels(request: Request, svc: HotelQueriesDep) -> Response:
    cache: HotelListCache | None = getattr(request.app.state, "hotel_list", None)
    if cache is None:
        cache = request.app.state.hotel_list = HotelListCache()
    return Response(await cache.body(svc), media_type="application/json")


@router.get(
    path="/hotels/{hotel_id}",
    summary="Hotel card (demo), rooms, facts summary and what we do not know yet",
    responses={404: {"description": "Unknown hotel"}},
)
async def get_hotel(hotel_id: UUID, svc: HotelQueriesDep) -> HotelOut:
    return HotelOut.from_view(await svc.get(hotel_id))


@router.get(path="/hotels/{hotel_id}/facts", summary="Every fact about a hotel, with evidence")
async def hotel_facts(
    hotel_id: UUID,
    svc: FactQueriesDep,
    characteristic: Annotated[str | None, Query(description="Registry key: sea_view")] = None,
) -> list[FactOut]:
    return [FactOut.from_domain(f) for f in await svc.of_hotel(hotel_id, characteristic)]


@router.get(
    path="/facts/{fact_id}",
    summary="«Почему мы так думаем»: method, sources, evidence and history",
    responses={404: {"description": "Unknown fact"}},
)
async def fact_detail(fact_id: UUID, svc: FactQueriesDep) -> FactDetailOut:
    return FactDetailOut.from_detail(await svc.detail(fact_id))
