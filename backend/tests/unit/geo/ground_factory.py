from unittest.mock import AsyncMock

import numpy as np
from shapely import Polygon

from app.domain.catalog import HotelGeo, hotel_id
from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import LonLat
from app.domain.knowledge.scope import Facade
from app.service.ports import SystemClock
from app.service.recipes.executor import Environment


def ground_hotel() -> HotelGeo:
    location = LonLat(39.7, 43.6)
    footprint = Polygon(
        LocalProjection(location).inverse(np.array([[-10, -10], [10, -10], [10, 10], [-10, 10]]))
    )
    return HotelGeo(
        hotel_id("way/1"),
        "way/1",
        "Отель",
        "center",
        location,
        footprint,
        3,
        9,
        "osm_levels",
        (Facade.N, Facade.E, Facade.S, Facade.W),
    )


def ground_env() -> Environment:
    reader = AsyncMock()
    reader.features_near.return_value = []
    reader.buildings_near.return_value = []
    reader.tagged.return_value = []
    reader.feature.return_value = None
    reader.facts_values.return_value = []
    return Environment(reader=reader, clock=SystemClock())
