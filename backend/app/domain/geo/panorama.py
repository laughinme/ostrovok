from dataclasses import dataclass

from app.domain.geo.peaks import VisiblePeak
from app.domain.geo.projection import FloatArray
from app.domain.geo.scene import Horizon


@dataclass(frozen=True, slots=True)
class WindowProfile:
    """Date-independent nominal window; angles in degrees, eye elevation in absolute metres."""

    azimuths_deg: FloatArray
    horizon: Horizon
    peaks: tuple[VisiblePeak, ...]
    minimum_sea_floor: int | None
    eye_m: float
