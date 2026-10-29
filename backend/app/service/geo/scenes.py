import asyncio
from collections import OrderedDict
from collections.abc import Sequence
from dataclasses import dataclass, field
from math import cos, radians, sin
from time import monotonic
from uuid import UUID, uuid4

import numpy as np
from shapely import Polygon
from shapely.geometry.base import BaseGeometry
from shapely.prepared import PreparedGeometry

from app.domain.catalog import BuildingShape, HotelGeo, MapFeature
from app.domain.geo.facades import FLOOR_HEIGHT_M, extract_facades
from app.domain.geo.peaks import Peak
from app.domain.geo.scene import Building, HeightSource, Scene
from app.domain.knowledge.scope import Facade
from app.infra.geo.view_scene import ViewSceneBuilder
from app.service.recipes.executor import Environment, NoDataError
from app.service.recipes.methods.local_scene import LocalFrame

_CACHE_TTL_S = 300
_CACHE_HOTELS = 3


@dataclass(slots=True)
class HotelScene:
    hotel: HotelGeo
    frame: LocalFrame
    builder: ViewSceneBuilder
    buildings: tuple[Building, ...]
    sea: BaseGeometry
    base_m: float
    peaks: tuple[Peak, ...]
    windows: dict[Facade, tuple[Scene, ...]] = field(default_factory=dict)
    cache_key: UUID = field(default_factory=uuid4)

    def prepare(self, facade: Facade) -> tuple[Scene, ...]:
        if facade not in self.hotel.facades:
            raise ValueError("Facade does not belong to this hotel")
        if facade not in self.windows:
            polygon = max(
                getattr(self.frame.footprint, "geoms", [self.frame.footprint]),
                key=lambda p: p.area,
            )
            walls = [w for w in extract_facades(polygon) if w.facade == facade]
            if not walls:
                raise NoDataError("у здания нет стены выбранного фасада")
            wall = max(walls, key=lambda w: w.length_m)
            dx, dy = sin(radians(wall.azimuth_deg)), cos(radians(wall.azimuth_deg))
            origins = [(x + dx * 0.2, y + dy * 0.2) for x, y in map(wall.point, (0.25, 0.5, 0.75))]
            prepared = tuple(
                self.builder.prepare(xy, wall.azimuth_deg, self.buildings, self.sea)
                for xy in origins
            )
            if any(np.any(~np.isfinite(s.terrain_m) & ~s.sea) for s in prepared):
                raise NoDataError("нет полного покрытия рельефа в поле зрения")
            self.windows[facade] = prepared
        return self.windows[facade]

    def eye(self, floor: int) -> float:
        return self.base_m + (floor - 0.5) * FLOOR_HEIGHT_M


class SceneCache:
    def __init__(self) -> None:
        self._entries: OrderedDict[tuple[object, ...], tuple[float, HotelScene]] = OrderedDict()
        self._lock = asyncio.Lock()

    def clear(self) -> None:
        self._entries.clear()

    async def get(self, hotel: HotelGeo, env: Environment) -> HotelScene:
        if env.terrain is None:
            raise NoDataError("нет модели рельефа")
        key = (hotel, id(env.terrain), id(env.sea))
        async with self._lock:
            entry = self._entries.get(key)
            if entry is None or monotonic() - entry[0] > _CACHE_TTL_S:
                scene = await _build(hotel, env)
                self._entries[key] = monotonic(), scene
            self._entries.move_to_end(key)
            while len(self._entries) > _CACHE_HOTELS:
                self._entries.popitem(last=False)
            return self._entries[key][1]


async def _build(hotel: HotelGeo, env: Environment) -> HotelScene:
    frame = LocalFrame(hotel)
    if env.terrain is None:
        raise NoDataError("нет модели рельефа")
    shapes = await env.reader.buildings_near(hotel.location, 2000)
    buildings = _local_buildings(shapes, frame)
    if not any(b.ref == hotel.osm_id for b in buildings):
        parts = getattr(frame.footprint, "geoms", [frame.footprint])
        buildings.extend(Building(hotel.osm_id, part, 0, hotel.height_m) for part in parts)
    builder = ViewSceneBuilder(env.terrain, frame.projection)
    try:
        based = await asyncio.to_thread(builder.buildings_with_bases, buildings)
    except ValueError as error:
        raise NoDataError("нет покрытия рельефа вокруг отеля") from error
    base = max(
        (b for b in based if b.ref == hotel.osm_id), key=lambda b: b.footprint.area
    ).base_elevation_m
    sea = env.sea.context if isinstance(env.sea, PreparedGeometry) else env.sea
    local_sea = frame.to_local(sea) if sea is not None else Polygon()
    features = await env.reader.features_near(hotel.location, 40000, kinds=["peak"])
    peaks = _local_peaks(features, frame)
    return HotelScene(hotel, frame, builder, based, local_sea, base, peaks)


def _local_buildings(shapes: Sequence[BuildingShape], frame: LocalFrame) -> list[Building]:
    buildings = []
    for shape in shapes:
        geometry = frame.to_local(shape.geometry)
        for polygon in getattr(geometry, "geoms", [geometry]):
            if isinstance(polygon, Polygon):
                source: HeightSource = "default"
                if shape.height_source == "osm_height":
                    source = "osm_height"
                elif shape.height_source == "osm_levels":
                    source = "osm_levels"
                buildings.append(
                    Building(shape.osm_id or "unknown", polygon, 0, shape.height_m, source)
                )
    return buildings


def _local_peaks(features: Sequence[MapFeature], frame: LocalFrame) -> tuple[Peak, ...]:
    peaks = []
    for feature in features:
        if not feature.name:
            continue
        try:
            elevation = float(feature.tags["ele"].replace(",", ".").removesuffix(" m"))
        except (KeyError, ValueError):
            continue
        point = frame.to_local(feature.geometry).centroid
        peaks.append(Peak(feature.osm_id, feature.name, (point.x, point.y), elevation))
    return tuple(peaks)


def scene_cache(env: Environment) -> SceneCache:
    cache = env.extras.get("view_scenes")
    if not isinstance(cache, SceneCache):
        cache = SceneCache()
        env.extras["view_scenes"] = cache
    return cache
