from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import FactQueriesDep, HotelQueriesDep
from app.api.schemas.hotels import HotelOut
from app.api.schemas.knowledge import FactDetailOut, FactOut
from app.api.v1.window import router as window_router

router = APIRouter(tags=["Hotels"])
router.include_router(window_router)


@router.get(path="/hotels", summary="Hotels of the region with a summary of what we know")
async def list_hotels(svc: HotelQueriesDep) -> list[HotelOut]:
    return [HotelOut.from_view(h) for h in await svc.many()]


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
