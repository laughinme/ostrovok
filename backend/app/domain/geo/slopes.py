from dataclasses import dataclass

import numpy as np

from app.domain.geo.projection import FloatArray


@dataclass(frozen=True, slots=True)
class SlopeSample:
    coordinates: tuple[tuple[float, float], ...]
    slope: float
    osm_ref: str | None = None


@dataclass(frozen=True, slots=True)
class SlopeStat:
    share: float
    samples: tuple[SlopeSample, ...]
    estimated: bool


def slope_stat(samples: tuple[SlopeSample, ...], *, estimated: bool = False) -> SlopeStat:
    if not samples or any(not np.isfinite(s.slope) for s in samples):
        raise ValueError("Expected nonempty finite slope samples")
    return SlopeStat(sum(abs(s.slope) > 0.08 for s in samples) / len(samples), samples, estimated)


def terrain_slopes(xy: FloatArray, heights: FloatArray, *, step_m: float) -> FloatArray:
    if heights.shape != (len(xy), 4) or step_m <= 0:
        raise ValueError("Expected four heights per cell and a positive probe step")
    dx = (heights[:, 1] - heights[:, 0]) / (2 * step_m)
    dy = (heights[:, 3] - heights[:, 2]) / (2 * step_m)
    return np.asarray(np.hypot(dx, dy), dtype=np.float64)
