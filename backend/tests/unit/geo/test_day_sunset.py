from datetime import date, datetime
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np
from shapely import Polygon, transform
from shapely.prepared import prep

from app.domain.catalog import BuildingShape
from app.domain.geo.projection import LocalProjection
from app.domain.geo.sun import MOSCOW
from app.domain.knowledge.fact import FactStatus
from app.domain.knowledge.scope import Facade, Scope
from app.service.geo.day_sunset import day_sunset, sunset_site_visible
from tests.unit.geo.ground_factory import ground_env, ground_hotel


def sea_env():
    hotel, env = ground_hotel(), ground_env()
    projection = LocalProjection(hotel.location)
    env.sea = prep(
        transform(
            Polygon([(-60000, -60000), (60000, -60000), (60000, 0), (-60000, 0)]),
            projection.inverse,
        )
    )
    env.terrain = Mock()
    env.terrain.elevation.side_effect = lambda points: np.zeros(len(points))
    return hotel, env, projection


def test_sunset_point_is_seasonal_and_buildings_can_block() -> None:
    hotel, env, projection = sea_env()
    assert sunset_site_visible(hotel.location, date(2026, 11, 12), env, [])
    assert not sunset_site_visible(hotel.location, date(2026, 6, 21), env, [])
    wall = Polygon([(-90, -200), (-110, -200), (-110, 200), (-90, 200)])
    obstacle = BuildingShape("way/5", transform(wall, projection.inverse), 80, None, "osm_height")
    assert not sunset_site_visible(hotel.location, date(2026, 11, 12), env, [obstacle])


async def test_window_fact_requires_month_confidence_and_current_status() -> None:
    hotel, env = ground_hotel(), ground_env()
    fact = SimpleNamespace(
        value=True,
        confidence=0.9,
        status=FactStatus.OK,
        scope=Scope(facades=frozenset({Facade.SW}), months=frozenset({11})),
        valid_until=None,
    )
    env.reader.facts_of.return_value = [fact]
    result = await day_sunset(hotel, env, date(2026, 11, 12), [])
    assert result.from_window
    assert result.window_scope == fact.scope
    assert result.at.utcoffset().total_seconds() == 3 * 3600
    assert not (await day_sunset(hotel, env, date(2026, 6, 12), [])).from_window
    fact.status = FactStatus.STALE
    assert not (await day_sunset(hotel, env, date(2026, 11, 12), [])).from_window
    fact.status = FactStatus.OK
    fact.valid_until = datetime(2020, 1, 1, tzinfo=MOSCOW)
    assert not (await day_sunset(hotel, env, date(2026, 11, 12), [])).from_window
