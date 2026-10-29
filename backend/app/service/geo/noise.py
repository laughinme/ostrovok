import asyncio
from collections.abc import Sequence
from dataclasses import dataclass

from app.domain.catalog import BuildingShape, HotelGeo, MapFeature
from app.domain.geo.noise import NoiseEstimate, facade_noise
from app.domain.geo.noise_sources import NoiseFeature, noise_sources
from app.domain.knowledge.scope import Facade
from app.service.recipes.executor import Environment, NoDataError
from app.service.recipes.methods.local_scene import LocalFrame

SOURCE_KINDS = {
    "road": "road",
    "railway": "railway",
    "bar_club": "bar_club",
    "construction": "construction",
    "aircraft": "runway",
}
RADIUS_M = 600
SCREEN_RADIUS_M = 250
AIRCRAFT_POWER_DB = 95.0


@dataclass(frozen=True, slots=True)
class FacadeNoise:
    facade: Facade
    day: NoiseEstimate
    night: NoiseEstimate


@dataclass(frozen=True, slots=True)
class HotelNoise:
    facades: tuple[FacadeNoise, ...]
    completeness: float
    source_count: int
    road_count: int
    unmodelled_refs: tuple[str, ...]


async def hotel_noise(
    hotel: HotelGeo, env: Environment, kinds: Sequence[str] = tuple(SOURCE_KINDS)
) -> HotelNoise:
    frame = LocalFrame(hotel)
    features = await env.reader.features_near(
        hotel.location, RADIUS_M, kinds=[SOURCE_KINDS[k] for k in kinds]
    )
    buildings = await env.reader.buildings_near(hotel.location, SCREEN_RADIUS_M)
    roads = sum(f.kind == "road" for f in features)
    return await asyncio.to_thread(_estimate, frame, features, buildings, roads)


def _estimate(
    frame: LocalFrame,
    features: Sequence[MapFeature],
    buildings: Sequence[BuildingShape],
    roads: int,
) -> HotelNoise:
    local = [NoiseFeature(f.osm_id, frame.to_local(f.geometry), f.tags) for f in features]
    sources = noise_sources(local, aircraft_power_db=AIRCRAFT_POWER_DB)
    screens = [frame.footprint, *frame.many_to_local([b.geometry for b in buildings])]
    receivers = frame.receivers()
    if not receivers:
        raise NoDataError("у здания нет фасадов")
    facades = []
    for receiver in receivers:
        estimates = [
            facade_noise(
                receiver.point,
                receiver.azimuth,
                sources.sources,
                period,
                buildings=screens,
                road_completeness=0.8 if roads else 0.5,
                source_completeness=max(0.5, sources.completeness),
            )
            for period in ("day", "night")
        ]
        facades.append(FacadeNoise(receiver.facade, estimates[0], estimates[1]))
    return HotelNoise(
        tuple(facades), sources.completeness, len(sources.sources), roads, sources.unmodelled_refs
    )
