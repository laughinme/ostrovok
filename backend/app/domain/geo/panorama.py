from dataclasses import dataclass

from app.domain.geo.peaks import VisiblePeak
from app.domain.geo.projection import FloatArray
from app.domain.geo.scene import Horizon


@dataclass(frozen=True, slots=True)
class WindowProfile:
    azimuths_deg: FloatArray
    horizon: Horizon
    peaks: tuple[VisiblePeak, ...]
    minimum_sea_floor: int | None
    eye_m: float
