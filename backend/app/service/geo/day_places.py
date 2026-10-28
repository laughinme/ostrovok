from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from app.domain.catalog import HotelGeo, MapFeature
from app.domain.geo.hours import parse_hours
from app.domain.geo.types import WalkProfile
from app.domain.geo.visits import open_for
from app.service.geo.routes import RouteView, route_view
from app.service.recipes.executor import Environment
from app.service.recipes.methods.reach import Walk, nearest_walk

LATE_HOUR = 23
MAX_LOCAL_WALK_MIN = 40


@dataclass(frozen=True, slots=True)
class DaySlot:
    at: datetime
    title: str
    place: str | None = None
    osm_ref: str | None = None
    route: RouteView | None = None
    unavailable_reason: str | None = None
    opening_hours: str | None = None


def meal_candidates(
    features: Sequence[MapFeature], arrival: datetime, stay_minutes: int, *, late: bool = False
) -> list[MapFeature]:
    amenities = {"restaurant"} if late else {"cafe", "restaurant", "fast_food"}
    candidates = []
    for feature in features:
        hours = feature.tags.get("opening_hours")
        if feature.tags.get("amenity") not in amenities or not open_for(
            hours, arrival, stay_minutes
        ):
            continue
        if (
            late
            and parse_hours(hours).is_open(arrival.replace(hour=LATE_HOUR, minute=30)) is not True
        ):
            continue
        candidates.append(feature)
    return candidates


def pharmacy_candidates(features: Sequence[MapFeature]) -> list[MapFeature]:
    return [
        f
        for f in features
        if f.tags.get("amenity") == "pharmacy"
        and parse_hours(f.tags.get("opening_hours")).always_open is True
    ]


def place_walk(hotel: HotelGeo, env: Environment, features: Sequence[MapFeature]) -> Walk | None:
    walk = nearest_walk(env.router, hotel.location, features, WalkProfile.WALK, terrain=env.terrain)
    return walk if walk is not None and walk.minutes <= MAX_LOCAL_WALK_MIN else None


def place_slot(
    hotel: HotelGeo,
    env: Environment,
    features: Sequence[MapFeature],
    at: datetime,
    title: str,
    *,
    missing: str,
) -> DaySlot:
    walk = place_walk(hotel, env, features)
    if walk is None:
        return DaySlot(at, title, unavailable_reason=missing)
    return DaySlot(
        at,
        title,
        walk.feature.name,
        walk.feature.osm_id,
        route_view(hotel, env, walk),
        opening_hours=walk.feature.tags.get("opening_hours"),
    )
