from dataclasses import dataclass

import numpy as np

from app.core.errors import NotFoundError
from app.domain.catalog import HotelGeo
from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import WalkProfile
from app.service.geo.targets import route_targets
from app.service.recipes.executor import Environment
from app.service.recipes.methods.reach import Walk, anchor, nearest_walk

PROFILE_STEP_M = 60.0


@dataclass(frozen=True, slots=True)
class RouteView:
    walk: Walk
    coordinates: tuple[tuple[float, float], ...]
    elevation_profile: tuple[tuple[float, float | None], ...]


async def hotel_route(
    hotel: HotelGeo, env: Environment, target: str, profile: WalkProfile
) -> RouteView:
    targets = await route_targets(hotel, env, target)
    walk = nearest_walk(env.router, hotel.location, targets, profile, terrain=env.terrain)
    if walk is None:
        raise NotFoundError("Нет доступного маршрута для выбранного профиля или цели")
    return route_view(hotel, env, walk)


def route_view(hotel: HotelGeo, env: Environment, walk: Walk) -> RouteView:
    if walk.route is not None:
        return RouteView(walk, walk.route.coordinates, walk.route.elevation_profile)
    target = anchor(walk.feature.geometry, hotel.location)
    projection = LocalProjection(hotel.location)
    end = projection.forward(np.array([target.lon, target.lat]))
    length = float(np.linalg.norm(end))
    distances = np.linspace(0, length, max(2, int(np.ceil(length / PROFILE_STEP_M)) + 1))
    xy = distances[:, None] / max(length, 1) * end
    coordinates = projection.inverse(xy)
    heights = (
        env.terrain.elevation(coordinates)
        if env.terrain is not None
        else np.full(len(coordinates), np.nan)
    )
    return RouteView(
        walk,
        tuple((float(x), float(y)) for x, y in coordinates),
        tuple(
            (float(d), float(h) if np.isfinite(h) else None)
            for d, h in zip(distances, heights, strict=True)
        ),
    )
