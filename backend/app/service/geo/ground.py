from datetime import date
from uuid import UUID

from app.db.database import Database
from app.db.repositories.catalog import hotel_geo
from app.domain.catalog import HotelGeo
from app.domain.geo.types import LonLat, WalkProfile
from app.service.catalog.hotels import HotelNotFoundError
from app.service.geo.climate import TripClimate, hotel_climate
from app.service.geo.day import DayPlan, build_day
from app.service.geo.noise import HotelNoise, hotel_noise
from app.service.geo.routes import RouteView, hotel_route, hotel_route_to
from app.service.recipes.executor import Environment


class GroundQueries:
    def __init__(self, db: Database, env: Environment) -> None:
        self.db, self.env = db, env

    async def hotel(self, hotel_id: UUID) -> HotelGeo:
        async with self.db.unit_of_work() as uow:
            row = await uow.catalog.hotel(hotel_id)
            if row is None:
                raise HotelNotFoundError()
            return hotel_geo(row)

    async def noise(self, hotel_id: UUID) -> HotelNoise:
        return await hotel_noise(await self.hotel(hotel_id), self.env)

    async def route(self, hotel_id: UUID, target: str, profile: WalkProfile) -> RouteView:
        return await hotel_route(await self.hotel(hotel_id), self.env, target, profile)

    async def route_to(
        self, hotel_id: UUID, point: LonLat, name: str, profile: WalkProfile
    ) -> RouteView:
        return await hotel_route_to(await self.hotel(hotel_id), self.env, point, name, profile)

    async def climate(self, hotel_id: UUID, start: date, end: date) -> TripClimate:
        return hotel_climate(await self.hotel(hotel_id), self.env, start, end)

    async def day(self, hotel_id: UUID, day: date) -> DayPlan:
        return await build_day(await self.hotel(hotel_id), self.env, day)
