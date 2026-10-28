from datetime import date
from pathlib import Path
from unittest.mock import Mock

import numpy as np
import pytest
from shapely import LineString, Point

from app.core.errors import DomainError, NotFoundError
from app.domain.catalog import MapFeature
from app.domain.geo.types import WalkProfile
from app.infra.geo.climate import ClimateCatalog
from app.service.geo.climate import hotel_climate
from app.service.geo.noise import hotel_noise
from app.service.geo.routes import hotel_route
from app.service.recipes.methods.reach import nearest_walk
from tests.unit.geo.ground_factory import ground_env, ground_hotel


async def test_noise_has_both_periods_and_osm_sources() -> None:
    hotel, env = ground_hotel(), ground_env()
    env.reader.features_near.return_value = [
        MapFeature(
            "way/22",
            "road",
            "Улица",
            {"highway": "primary"},
            LineString([(39.7005, 43.59), (39.7005, 43.61)]),
        )
    ]
    result = await hotel_noise(hotel, env)
    east = next(f for f in result.facades if f.facade.value == "E")
    west = next(f for f in result.facades if f.facade.value == "W")
    assert east.day.index_db > west.day.index_db
    assert east.day.sources[0].osm_ref == "way/22"
    assert east.night.period == "night"
    assert result.source_count == 1
    assert env.reader.features_near.await_count == 1


async def test_unknown_noise_is_not_silence() -> None:
    result = await hotel_noise(ground_hotel(), ground_env())
    assert result.completeness == 0
    assert all(f.day.index_db is None and f.night.category is None for f in result.facades)


async def test_estimated_route_and_explicit_osm_target() -> None:
    hotel, env = ground_hotel(), ground_env()
    env.reader.feature.return_value = MapFeature("way/42", "poi", "Кофе", {}, Point(39.701, 43.6))
    env.terrain = Mock()
    env.terrain.elevation.side_effect = lambda p: np.linspace(10, 20, len(p))
    result = await hotel_route(hotel, env, "osm:way/42", WalkProfile.WALK)
    assert result.walk.estimated
    assert len(result.coordinates) > 1
    assert result.elevation_profile[0][1] == 10
    assert result.elevation_profile[-1][1] == 20
    env.reader.feature.assert_awaited_once_with("way/42")


async def test_no_accessible_graph_path_never_turns_into_straight_walk() -> None:
    hotel, env = ground_hotel(), ground_env()
    env.reader.features_near.return_value = [
        MapFeature("way/42", "beach", None, {}, Point(39.701, 43.6))
    ]
    env.router = Mock()
    env.router.nearest_of.return_value = None
    with pytest.raises(NotFoundError):
        await hotel_route(hotel, env, "beach", WalkProfile.STROLLER)
    assert (
        nearest_walk(
            None, hotel.location, env.reader.features_near.return_value, WalkProfile.WHEELCHAIR
        )
        is None
    )


def test_climate_dates_and_inland_missing_water() -> None:
    hotel, env = ground_hotel(), ground_env()
    env.climate = ClimateCatalog.from_file(Path("data/region/climate.json"))
    result = hotel_climate(hotel, env, date(2026, 11, 10), date(2026, 11, 15))
    assert result.estimate.days == 5
    assert result.estimate.values["air_max_c"] is not None
    for end in (date(2026, 11, 10), date(2026, 11, 1), date(2028, 1, 1)):
        with pytest.raises(DomainError):
            hotel_climate(hotel, env, date(2026, 11, 10), end)
