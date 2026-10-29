from dataclasses import dataclass, field
from enum import StrEnum


@dataclass(frozen=True, slots=True)
class LonLat:
    lon: float
    lat: float


class WalkProfile(StrEnum):
    """Who walks: a stroller cannot take steps, a wheelchair also avoids steep slopes."""

    WALK = "walk"
    STROLLER = "stroller"
    WHEELCHAIR = "wheelchair"


@dataclass(frozen=True, slots=True)
class RouteLeg:
    minutes: float
    length_m: float
    climb_m: float
    descent_m: float
    steps: int
    crossings: int


@dataclass(frozen=True, slots=True)
class Route:
    origin: LonLat
    target: LonLat
    profile: WalkProfile
    there: RouteLeg
    back: RouteLeg
    coordinates: tuple[tuple[float, float], ...]
    elevation_profile: tuple[tuple[float, float], ...]
    uncertain_share: float = 0.0
    osm_refs: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class Reachable:
    ref: str
    name: str | None
    minutes: float
    location: LonLat
