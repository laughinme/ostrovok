from dataclasses import dataclass, field
from enum import StrEnum


@dataclass(frozen=True, slots=True)
class LonLat:
    lon: float
    lat: float


class WalkProfile(StrEnum):
    """Who walks (09 §6.2): a stroller cannot take steps, a wheelchair also avoids steep slopes."""

    WALK = "walk"
    STROLLER = "stroller"
    WHEELCHAIR = "wheelchair"


@dataclass(frozen=True, slots=True)
class RouteLeg:
    """One direction of a walk: there and back differ on a slope."""

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
    """(distance m, elevation m) along the way there."""
    uncertain_share: float = 0.0
    """Share of the way on paths with unknown surface or unclear crossings: lowers confidence."""
    osm_refs: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class Reachable:
    """A place reachable on foot within a time budget."""

    ref: str
    name: str | None
    minutes: float
    location: LonLat
