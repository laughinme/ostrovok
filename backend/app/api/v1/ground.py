import datetime as dt
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Path, Query

from app.api.ground_deps import GeocoderDep, GroundQueriesDep
from app.api.schemas.day import DayPlanOut
from app.api.schemas.directions import PlaceOut
from app.api.schemas.ground import ClimateOut, NoiseOut, RouteOut
from app.core.errors import DomainError
from app.domain.geo.types import LonLat, WalkProfile

router = APIRouter(tags=["Hotels"])
_MIN_ADDRESS_LENGTH = 3
_ROUTE_TARGET = r"^(beach|center|station|osm:(node|way|relation)/[1-9][0-9]*)$"


@router.get("/hotels/{hotel_id}/places", summary="Search an address on explicit user submission")
async def hotel_places(
    hotel_id: UUID,
    svc: GroundQueriesDep,
    search: GeocoderDep,
    q: Annotated[str, Query(min_length=_MIN_ADDRESS_LENGTH, max_length=200)],
) -> list[PlaceOut]:
    if len(q.strip()) < _MIN_ADDRESS_LENGTH:
        raise DomainError("Введите минимум три символа адреса")
    hotel = await svc.hotel(hotel_id)
    return [
        PlaceOut(ref=place.ref, name=place.name, address=place.address, location=place.location)
        for place in await search.search(q, hotel.location)
    ]


@router.get("/hotels/{hotel_id}/route", summary="Walk to an arbitrary coordinate on the OSM graph")
async def hotel_route_to(
    hotel_id: UUID,
    svc: GroundQueriesDep,
    lon: Annotated[float, Query(ge=-180, le=180, allow_inf_nan=False)],
    lat: Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)],
    name: Annotated[str, Query(min_length=1, max_length=200)] = "Выбранный адрес",
    profile: WalkProfile = WalkProfile.WALK,
) -> RouteOut:
    return RouteOut.from_route(
        hotel_id, await svc.route_to(hotel_id, LonLat(lon, lat), name, profile), profile
    )


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
    start: Annotated[dt.date, Query(alias="from")],
    end: Annotated[dt.date, Query(alias="to")],
) -> ClimateOut:
    return ClimateOut.from_climate(hotel_id, await svc.climate(hotel_id, start, end))


@router.get("/hotels/{hotel_id}/day", summary="A day around the hotel, without an LLM")
async def hotel_day(hotel_id: UUID, svc: GroundQueriesDep, date: dt.date) -> DayPlanOut:
    return DayPlanOut.from_plan(await svc.day(hotel_id, date))
