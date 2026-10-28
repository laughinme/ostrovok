import asyncio
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime

import numpy as np
from shapely import Polygon, transform
from shapely.prepared import PreparedGeometry

from app.domain.catalog import BuildingShape, HotelGeo, MapFeature
from app.domain.geo.horizon import evaluate_horizon
from app.domain.geo.projection import LocalProjection
from app.domain.geo.scene import Building
from app.domain.geo.sun import sun_events
from app.domain.geo.types import LonLat
from app.domain.knowledge.fact import FactStatus
from app.domain.knowledge.scope import Scope
from app.infra.geo.view_scene import ViewSceneBuilder
from app.service.geo.day_places import place_walk
from app.service.geo.routes import RouteView, route_view
from app.service.recipes.executor import Environment
from app.service.recipes.methods.reach import anchor

WINDOW_CONFIDENCE = 0.65
BUILDING_RADIUS_M = 2000
HORIZON_LIMIT_DEG = 0.5
SEA_RAY_START_M = 1000


@dataclass(frozen=True, slots=True)
class DaySunset:
    at: datetime
    from_window: bool
    spot: str | None = None
    osm_ref: str | None = None
    route: RouteView | None = None
    window_scope: Scope | None = None


async def day_sunset(
    hotel: HotelGeo, env: Environment, day: date, beaches: Sequence[MapFeature]
) -> DaySunset:
    event = sun_events(hotel.location, day).sunset
    facts = await env.reader.facts_of(hotel, "sunset_over_sea")
    for fact in facts:
        if (
            fact.value is True
            and fact.confidence >= WINDOW_CONFIDENCE
            and fact.status is FactStatus.OK
            and (not fact.scope.months or day.month in fact.scope.months)
            and (fact.valid_until is None or fact.valid_until > env.clock.now())
        ):
            return DaySunset(event.at, True, window_scope=fact.scope)
    candidates = list(beaches)
    while candidates and env.terrain is not None and env.sea is not None:
        walk = place_walk(hotel, env, candidates)
        if walk is None:
            break
        location = anchor(walk.feature.geometry, hotel.location)
        shapes = await env.reader.buildings_near(location, BUILDING_RADIUS_M)
        visible = await asyncio.to_thread(sunset_site_visible, location, day, env, shapes)
        if visible:
            sunset = sun_events(location, day).sunset
            return DaySunset(
                sunset.at,
                False,
                walk.feature.name or "Точка у моря",
                walk.feature.osm_id,
                route_view(hotel, env, walk),
            )
        candidates = [f for f in candidates if f.osm_id != walk.feature.osm_id]
    return DaySunset(event.at, False)


def sunset_site_visible(
    location: LonLat, day: date, env: Environment, shapes: Sequence[BuildingShape]
) -> bool:
    """A standing observer: buildings + DEM, with open sea along the sunset ray to 40 km."""
    if env.terrain is None or env.sea is None:
        return False
    projection = LocalProjection(location)
    sea = env.sea.context if isinstance(env.sea, PreparedGeometry) else env.sea
    local_sea = transform(sea, projection.forward)
    buildings = _buildings(shapes, projection)
    builder = ViewSceneBuilder(env.terrain, projection)
    try:
        based = builder.buildings_with_bases(buildings) if buildings else ()
        azimuth = sun_events(location, day).sunset.azimuth_deg
        scene = builder.prepare((0, 0), azimuth, based, local_sea)
        ground = env.terrain.elevation(np.array([[location.lon, location.lat]]))[0]
        if not np.isfinite(ground):
            return False
        horizon = evaluate_horizon(scene, float(ground) + 1.6)
    except ValueError:
        return False
    ray = int(np.argmin(np.abs((scene.azimuths_deg - azimuth + 180) % 360 - 180)))
    return bool(
        horizon.sea_visible[ray]
        and horizon.angle_deg[ray] < HORIZON_LIMIT_DEG
        and np.all(scene.sea[ray, scene.distances_m >= SEA_RAY_START_M])
    )


def _buildings(shapes: Sequence[BuildingShape], projection: LocalProjection) -> list[Building]:
    result: list[Building] = []
    for shape in shapes:
        geometry = transform(shape.geometry, projection.forward)
        result.extend(
            Building(shape.osm_id or "unknown", polygon, 0, shape.height_m)
            for polygon in getattr(geometry, "geoms", [geometry])
            if isinstance(polygon, Polygon)
        )
    return result
