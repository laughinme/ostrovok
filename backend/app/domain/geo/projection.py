from dataclasses import dataclass
from math import cos, radians

import numpy as np
from numpy.typing import NDArray

from app.domain.geo.types import LonLat

EARTH_RADIUS_M = 6_371_008.8
_COORDINATES = 2
_LAT_LIMIT = 90
_LON_LIMIT = 180
type FloatArray = NDArray[np.float64]


def points_array(points: FloatArray) -> FloatArray:
    """Validate an array of coordinate pairs, preserving any leading dimensions."""
    result = np.asarray(points, dtype=np.float64)
    if result.ndim < 1 or result.shape[-1] != _COORDINATES or not np.all(np.isfinite(result)):
        raise ValueError("Expected finite coordinate pairs (..., 2)")
    return result


@dataclass(frozen=True, slots=True)
class LocalProjection:
    """Local equirectangular projection: x east, y north, metres; input lon, lat degrees."""

    origin: LonLat

    def __post_init__(self) -> None:
        if (
            not -_LAT_LIMIT < self.origin.lat < _LAT_LIMIT
            or not -_LON_LIMIT <= self.origin.lon <= _LON_LIMIT
        ):
            raise ValueError("Projection origin must be a non-polar WGS84 point")

    @property
    def _scale(self) -> FloatArray:
        return np.array([cos(radians(self.origin.lat)), 1.0]) * radians(1) * EARTH_RADIUS_M

    def forward(self, points: FloatArray) -> FloatArray:
        """WGS84 (..., 2) lon/lat degrees → local (..., 2) x/y metres."""
        delta = points_array(points) - [self.origin.lon, self.origin.lat]
        delta = delta.copy()
        delta[..., 0] = (delta[..., 0] + 180) % 360 - 180
        return delta * self._scale

    def inverse(self, points: FloatArray) -> FloatArray:
        """Local (..., 2) x/y metres → WGS84 (..., 2) lon/lat degrees."""
        result = points_array(points) / self._scale + [self.origin.lon, self.origin.lat]
        result[..., 0] = (result[..., 0] + 180) % 360 - 180
        return result
