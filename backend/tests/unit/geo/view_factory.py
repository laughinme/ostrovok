from datetime import UTC, datetime

import numpy as np
from shapely import Point, box, transform
from shapely.prepared import prep

from app.domain.catalog import BuildingShape, HotelGeo, MapFeature, building_facades, hotel_id
from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import LonLat
from app.service.recipes.executor import Environment, GeoReader


class FlatTerrain:
    def elevation(self, points: np.ndarray) -> np.ndarray:
        return np.zeros(len(points))

    def far_horizon(self, *args: object, **kwargs: object) -> tuple[np.ndarray, np.ndarray]:
        raise AssertionError("Use ordered terrain samples")


class FixedClock:
    def now(self) -> datetime:
        return datetime(2026, 10, 28, tzinfo=UTC)


class SceneReader(GeoReader):
    def __init__(self, hotel: HotelGeo) -> None:
        self.hotel = hotel
        self.calls = 0

    async def buildings_near(self, *args: object, **kwargs: object) -> list[BuildingShape]:
        self.calls += 1
        return [BuildingShape(self.hotel.osm_id, self.hotel.footprint, 18, 6, "osm_levels")]

    async def features_near(self, *args: object, **kwargs: object) -> list[MapFeature]:
        return [MapFeature("node/1", "peak", "Гора", {"ele": "1000"}, Point(39.7, 43.65))]


def view_environment(*, floors: int = 6) -> tuple[HotelGeo, Environment]:
    origin = LonLat(39.7, 43.6)
    projection = LocalProjection(origin)
    footprint = transform(box(-15, -10, 15, 10), projection.inverse)
    hotel = HotelGeo(
        hotel_id("way/1"),
        "way/1",
        "Тест",
        "center",
        origin,
        footprint,
        floors,
        floors * 3,
        "osm_levels",
        building_facades(footprint),
    )
    sea = prep(transform(box(-50000, -50000, 50000, -50), projection.inverse))
    return hotel, Environment(SceneReader(hotel), FixedClock(), terrain=FlatTerrain(), sea=sea)
