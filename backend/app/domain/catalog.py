from collections.abc import Mapping
from dataclasses import dataclass
from uuid import NAMESPACE_URL, UUID, uuid5

import numpy as np
from shapely import Polygon
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
    """Stable id from the OSM id: seed files, URLs and the frontend survive a reload."""
    return uuid5(_HOTEL_NAMESPACE, osm_id)


def floors_of(levels: float | None, height_m: float) -> int:
    if levels:
        return max(1, round(levels))
    return max(1, round(height_m / FLOOR_HEIGHT_M))


def footprint_in_metres(footprint: BaseGeometry) -> tuple[Polygon, LonLat]:
    """The largest polygon of a footprint in local metres around its centroid."""
    polygon = max(getattr(footprint, "geoms", [footprint]), key=lambda g: g.area)
    origin = LonLat(polygon.centroid.x, polygon.centroid.y)
    projection = LocalProjection(origin)
    local = Polygon(projection.forward(np.asarray(polygon.exterior.coords)))
    return local, origin


def building_facades(footprint: BaseGeometry) -> tuple[Facade, ...]:
    """Real sides of the building with walls long enough to have windows, in compass order."""
    local, _ = footprint_in_metres(footprint)
    if not local.is_valid:
        local = local.buffer(0)
    walls = extract_facades(local)
    sides = {wall.facade for wall in walls if wall.length_m >= _MIN_FACADE_M}
    return tuple(f for f in Facade if f in sides) or tuple({w.facade for w in walls})


@dataclass(frozen=True, slots=True)
class HotelGeo:
    """Everything the research tools need about one hotel; geometry in WGS84."""

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
