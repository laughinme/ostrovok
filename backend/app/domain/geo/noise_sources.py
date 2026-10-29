from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from shapely.geometry.base import BaseGeometry

from app.domain.geo.hours import parse_hours
from app.domain.geo.noise import NoiseSource

ROAD_POWERS_DB = {
    "motorway": 75.0,
    "trunk": 75.0,
    "primary": 70.0,
    "secondary": 65.0,
    "tertiary": 60.0,
    "residential": 50.0,
    "living_street": 50.0,
    "service": 50.0,
}


@dataclass(frozen=True, slots=True)
class NoiseFeature:
    osm_ref: str
    geometry: BaseGeometry
    tags: Mapping[str, str]
    late_open: bool | None = None


@dataclass(frozen=True, slots=True)
class NoiseSources:
    sources: tuple[NoiseSource, ...]
    unmodelled_refs: tuple[str, ...]

    @property
    def completeness(self) -> float:
        total = len(self.sources) + len(self.unmodelled_refs)
        return len(self.sources) / total if total else 0.0


def _powers(
    feature: NoiseFeature, aircraft_power_db: float | None
) -> tuple[str, float | None, float | None] | None:
    tags = feature.tags
    highway = tags.get("highway", "").removesuffix("_link")
    if highway in ROAD_POWERS_DB:
        power = ROAD_POWERS_DB[highway]
        return "road", power, power
    if tags.get("railway") in {"rail", "light_rail", "tram", "narrow_gauge"}:
        return "rail", 75.0, 75.0
    if tags.get("aeroway") in {"runway", "aerodrome"}:
        return "aircraft", aircraft_power_db, aircraft_power_db
    if tags.get("landuse") == "construction" or tags.get("building") == "construction":
        return "construction", 65.0, None
    return _nightlife(feature)


def _nightlife(feature: NoiseFeature) -> tuple[str, float | None, float | None] | None:
    tags = feature.tags
    if tags.get("amenity") not in {"bar", "pub", "nightclub"}:
        return None
    known_late = feature.late_open
    if known_late is None:
        known_late = parse_hours(tags.get("opening_hours")).at_night
    if known_late is False:
        return None
    power = 70.0 if tags.get("amenity") == "nightclub" else 60.0
    return "nightlife", None, power if known_late else None


def noise_sources(
    features: Sequence[NoiseFeature],
    *,
    aircraft_power_db: float | None = None,
    rail_activity_share: float = 1.0,
) -> NoiseSources:
    if not 0 <= rail_activity_share <= 1:
        raise ValueError("Rail activity share must be in [0, 1]")
    sources: list[NoiseSource] = []
    missing: list[str] = []
    seen: set[str] = set()
    for feature in features:
        if feature.osm_ref in seen:
            continue
        seen.add(feature.osm_ref)
        powers = _powers(feature, aircraft_power_db)
        if powers is None:
            continue
        kind, day, night = powers
        if day is None and night is None:
            missing.append(feature.osm_ref)
        else:
            share = rail_activity_share if kind == "rail" else 1.0
            sources.append(NoiseSource(feature.osm_ref, kind, feature.geometry, day, night, share))
    return NoiseSources(tuple(sources), tuple(missing))
