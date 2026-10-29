from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from uuid import NAMESPACE_URL, UUID, uuid5

import numpy as np
import shapely
from shapely import Point, Polygon
from shapely.geometry.base import BaseGeometry

from app.domain.geo.facades import FLOOR_HEIGHT_M, extract_facades
from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import LonLat
from app.domain.knowledge.scope import Facade

DISTRICT_TITLES = {
    "center": "Центр",
    "khosta": "Хоста",
    "adler": "Адлер",
    "sirius": "Сириус",
    "krasnaya_polyana": "Красная Поляна",
}
_MIN_FACADE_M = 4.0
_HOTEL_NAMESPACE = uuid5(NAMESPACE_URL, "https://okno.example/hotels")


def hotel_id(osm_id: str) -> UUID:
    return uuid5(_HOTEL_NAMESPACE, osm_id)


def floors_of(levels: float | None, height_m: float) -> int:
    if levels:
        return max(1, round(levels))
    return max(1, round(height_m / FLOOR_HEIGHT_M))


def footprint_in_metres(footprint: BaseGeometry) -> tuple[Polygon, LonLat]:
    polygon = max(getattr(footprint, "geoms", [footprint]), key=lambda g: g.area)
    origin = LonLat(polygon.centroid.x, polygon.centroid.y)
    projection = LocalProjection(origin)
    local = Polygon(projection.forward(np.asarray(polygon.exterior.coords)))
    return local, origin


def building_facades(footprint: BaseGeometry) -> tuple[Facade, ...]:
    local, _ = footprint_in_metres(footprint)
    if not local.is_valid:
        local = local.buffer(0)
    walls = extract_facades(local)
    sides = {wall.facade for wall in walls if wall.length_m >= _MIN_FACADE_M}
    return tuple(f for f in Facade if f in sides) or tuple({w.facade for w in walls})


@dataclass(frozen=True, slots=True)
class HotelGeo:
    id: UUID
    osm_id: str
    name: str
    district: str
    location: LonLat
    footprint: BaseGeometry
    floors: int
    height_m: float
    height_source: str
    facades: tuple[Facade, ...]
    ground_m: float = 0.0


@dataclass(frozen=True, slots=True)
class MapFeature:
    osm_id: str
    kind: str
    name: str | None
    tags: Mapping[str, str]
    geometry: BaseGeometry


@dataclass(frozen=True, slots=True)
class BuildingShape:
    osm_id: str | None
    geometry: BaseGeometry
    height_m: float
    levels: int | None
    height_source: str


@dataclass(frozen=True, slots=True)
class Nearby:
    kind: str
    title: str
    name: str | None
    distance_m: float
    osm_ref: str
    location: LonLat


NEARBY_KINDS: tuple[tuple[str, str, float], ...] = (
    ("beach", "Пляж", 2500),
    ("food", "Кафе", 1200),
    ("grocery", "Магазин", 1200),
    ("pharmacy", "Аптека", 1200),
    ("park", "Парк", 1200),
    ("playground", "Детская площадка", 1200),
    ("station", "Станция", 1200),
)


_KIND_BY_TAG: Mapping[tuple[str, str], str] = {
    ("amenity", "cafe"): "food",
    ("amenity", "restaurant"): "food",
    ("amenity", "fast_food"): "food",
    ("shop", "supermarket"): "grocery",
    ("shop", "convenience"): "grocery",
    ("amenity", "pharmacy"): "pharmacy",
    ("leisure", "playground"): "playground",
}


_PRIVATE_GROUNDS = ("санатори", "пансионат", "детский сад", "школ", "больниц")


def nearby_kind(feature: MapFeature) -> str | None:
    if feature.kind in {"beach", "station"}:
        return feature.kind
    tags, name = feature.tags, (feature.name or "").lower()
    if any(word in name for word in _PRIVATE_GROUNDS):
        return None
    if feature.kind == "park":
        grounds = bool({"tourism", "amenity"} & tags.keys()) and tags.get("tourism") != "attraction"
        return "park" if tags.get("leisure") == "park" and not grounds else None
    return next((k for (tag, v), k in _KIND_BY_TAG.items() if tags.get(tag) == v), None)


def nearby_places(origin: LonLat, features: Sequence[MapFeature]) -> tuple[Nearby, ...]:
    projection = LocalProjection(origin)
    here = Point(0, 0)
    best: dict[str, tuple[bool, float, MapFeature]] = {}
    radius = {kind: r for kind, _, r in NEARBY_KINDS}
    for feature in features:
        kind = nearby_kind(feature)
        if kind is None:
            continue
        distance = shapely.transform(feature.geometry, projection.forward).distance(here)
        if distance > radius[kind]:
            continue
        rank = (feature.name is None, distance)
        if kind not in best or rank < best[kind][:2]:
            best[kind] = (*rank, feature)
    places = []
    for kind, title, _ in NEARBY_KINDS:
        if kind in best:
            _, distance, feature = best[kind]
            point = feature.geometry.representative_point()
            places.append(
                Nearby(
                    kind, title, feature.name, distance, feature.osm_id, LonLat(point.x, point.y)
                )
            )
    return tuple(places)
