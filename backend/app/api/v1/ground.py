from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Path, Query

from app.api.ground_deps import GroundQueriesDep
from app.api.schemas.ground import ClimateOut, NoiseOut, RouteOut
from app.domain.geo.types import WalkProfile

router = APIRouter(tags=["Hotels"])
_ROUTE_TARGET = r"^(beach|center|station|osm:(node|way|relation)/[1-9][0-9]*)$"


@router.get("/hotels/{hotel_id}/noise", summary="Outdoor noise model by facade, day and night")
async def hotel_noise(hotel_id: UUID, svc: GroundQueriesDep) -> NoiseOut:
    return NoiseOut.from_noise(hotel_id, await svc.noise(hotel_id))


@router.get("/hotels/{hotel_id}/routes/{target:path}", summary="Walk there and back with elevation")
async def hotel_route(
    hotel_id: UUID,
    svc: GroundQueriesDep,
    target: Annotated[str, Path(pattern=_ROUTE_TARGET)],
    profile: WalkProfile = WalkProfile.WALK,
) -> RouteOut:
    return RouteOut.from_route(hotel_id, await svc.route(hotel_id, target, profile), profile)


@router.get("/hotels/{hotel_id}/climate", summary="Climate normals weighted by trip dates")
async def hotel_climate(
    hotel_id: UUID,
    svc: GroundQueriesDep,
    start: Annotated[date, Query(alias="from")],
    end: Annotated[date, Query(alias="to")],
) -> ClimateOut:
    return ClimateOut.from_climate(hotel_id, await svc.climate(hotel_id, start, end))
