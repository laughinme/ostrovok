"""Conditional outdoor noise index (04 §4.2), never a measured LAeq."""

from collections.abc import Sequence
from dataclasses import dataclass
from math import atan2, degrees, isfinite, log10
from typing import Literal

from shapely import Point, shortest_line
from shapely.geometry.base import BaseGeometry

NoiseClass = Literal["тихо", "умеренно", "шумно"]
Period = Literal["day", "night"]
CLASS_BOUNDARIES_DB = (30.0, 45.0)
MODEL_CONFIDENCE_CAP = 0.75
FRONT_HALF_ANGLE = 90.0


@dataclass(frozen=True, slots=True)
class NoiseSource:
    """Geometry in local metres; conditional powers at 1 m, not acoustic measurements."""

    osm_ref: str
    kind: str
    geometry: BaseGeometry
    day_db: float | None
    night_db: float | None
    activity_share: float = 1.0


@dataclass(frozen=True, slots=True)
class NoiseContribution:
    osm_ref: str
    kind: str
    index_db: float
    distance_m: float
    screened: bool
    orientation_loss_db: float


@dataclass(frozen=True, slots=True)
class NoiseEstimate:
    period: Period
    index_db: float | None
    category: NoiseClass | None
    confidence: float
    margin_db: float | None
    sources: tuple[NoiseContribution, ...]


def energy_sum(levels_db: Sequence[float]) -> float | None:
    """Sum independent conditional sound energies; no sources means unknown."""
    if not levels_db:
        return None
    if not all(isfinite(level) for level in levels_db):
        raise ValueError("Noise levels must be finite")
    peak = max(levels_db)
    return peak + 10 * log10(sum(10 ** ((level - peak) / 10) for level in levels_db))


def noise_class(index_db: float) -> NoiseClass:
    """Uncalibrated thresholds on the conditional index, not sanitary limits."""
    if index_db < CLASS_BOUNDARIES_DB[0]:
        return "тихо"
    if index_db < CLASS_BOUNDARIES_DB[1]:
        return "умеренно"
    return "шумно"


def orientation_loss(facade_azimuth: float, source_bearing: float) -> float:
    """0 dB in front; the rear half loses 5–15 dB (north=0°, east=90°)."""
    angle = abs((source_bearing - facade_azimuth + 180) % 360 - 180)
    return 0.0 if angle <= FRONT_HALF_ANGLE else 5 + 10 * (angle - 90) / 90


def contribution(
    source: NoiseSource,
    receiver: Point,
    facade_azimuth: float,
    period: Period,
    buildings: Sequence[BaseGeometry] = (),
) -> NoiseContribution | None:
    """Attenuate along the shortest source-to-window line, all coordinates in metres."""
    power = source.day_db if period == "day" else source.night_db
    if power is None or source.activity_share == 0:
        return None
    if not 0 < source.activity_share <= 1 or not isfinite(power):
        raise ValueError("Invalid source power or activity share")
    ray = shortest_line(receiver, source.geometry)
    if ray is None or ray.is_empty:
        return None
    x, y = ray.coords[-1][:2]
    distance = float(receiver.distance(source.geometry))
    bearing = degrees(atan2(x - receiver.x, y - receiver.y)) % 360
    loss = orientation_loss(facade_azimuth, bearing) if distance > 0 else 0.0
    # Tangencies do not block sound; a ray through the hotel itself does.
    screened = any(
        ray.intersection(building).length > 0 and not ray.touches(building)
        for building in buildings
    )
    level = power - 20 * log10(max(1.0, distance)) + 10 * log10(source.activity_share)
    return NoiseContribution(
        source.osm_ref, source.kind, level - loss - 10 * screened, distance, screened, loss
    )


def facade_noise(
    receiver: Point,
    facade_azimuth: float,
    sources: Sequence[NoiseSource],
    period: Period,
    *,
    buildings: Sequence[BaseGeometry] = (),
    road_completeness: float = 0.5,
    source_completeness: float = 1.0,
    top_n: int = 5,
) -> NoiseEstimate:
    """Return index, class, confidence and strongest OSM refs for one facade/period."""
    if not 0 <= road_completeness <= 1 or not 0 <= source_completeness <= 1 or top_n < 0:
        raise ValueError("Completeness must be in [0, 1] and top_n nonnegative")
    items = [
        item
        for source in sources
        if (item := contribution(source, receiver, facade_azimuth, period, buildings)) is not None
    ]
    level = energy_sum([item.index_db for item in items])
    if level is None:
        return NoiseEstimate(period, None, None, 0.0, None, ())
    margin = min(abs(level - boundary) for boundary in CLASS_BOUNDARIES_DB)
    certainty = 0.5 + 0.25 * min(margin / 10, 1)
    confidence = min(MODEL_CONFIDENCE_CAP, certainty) * road_completeness * source_completeness
    strongest = sorted(items, key=lambda item: (-item.index_db, item.osm_ref))[:top_n]
    return NoiseEstimate(period, level, noise_class(level), confidence, margin, tuple(strongest))
