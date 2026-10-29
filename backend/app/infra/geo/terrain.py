import json
from collections import OrderedDict
from pathlib import Path

import numpy as np
from numpy.typing import NDArray

from app.domain.geo.earth import elevation_angle, ray_coordinates
from app.domain.geo.projection import FloatArray, LocalProjection, points_array
from app.domain.geo.types import LonLat

_AFFINE_SIZE = 6
_GRID_DIMENSIONS = 2
_PIXEL_HALF = 0.5
_PIXEL_TOLERANCE = 1e-9
_MIN_STEP_M = 30
_MAX_STEP_M = 90
type HorizonKey = tuple[float, float, float, bytes, float]


class NpyTerrain:
    def __init__(self, directory: Path, *, step_m: float = 60, cache_size: int = 128) -> None:
        if not _MIN_STEP_M <= step_m <= _MAX_STEP_M or cache_size < 1:
            raise ValueError("DEM step must be 30..90 m and cache size positive")
        self._step_m = step_m
        self._cache_size = cache_size
        self._cache: OrderedDict[HorizonKey, tuple[FloatArray, FloatArray]] = OrderedDict()
        metadata = json.loads((directory / "dem.json").read_text())
        if metadata.get("crs") != "EPSG:4326":
            raise ValueError("DEM must use EPSG:4326")
        transform = np.asarray(metadata["transform"], dtype=np.float64)
        if transform.shape != (_AFFINE_SIZE,) or not np.all(np.isfinite(transform)):
            raise ValueError("Expected six finite Affine coefficients")
        a, b, c, d, e, f = transform
        self._inverse = np.linalg.inv(np.array([[a, b], [d, e]]))
        self._offset = np.array([c, f])
        self._grid: NDArray[np.int16] = np.load(
            directory / "dem_int16.npy", mmap_mode="r", allow_pickle=False
        )
        if (
            self._grid.ndim != _GRID_DIMENSIONS
            or self._grid.dtype != np.int16
            or 0 in self._grid.shape
        ):
            raise ValueError("DEM must be a nonempty two-dimensional int16 grid")
        self._nodata: int | None = metadata.get("nodata")

    def elevation(self, points: FloatArray) -> FloatArray:
        coordinates = points_array(points)
        if coordinates.ndim != _GRID_DIMENSIONS:
            raise ValueError("Expected (n, 2) WGS84 points")
        pixels = (coordinates - self._offset) @ self._inverse.T - 0.5
        height, width = self._grid.shape
        valid = np.all(
            (pixels >= -_PIXEL_HALF - _PIXEL_TOLERANCE)
            & (pixels <= [width - 0.5 + _PIXEL_TOLERANCE, height - 0.5 + _PIXEL_TOLERANCE]),
            axis=1,
        )
        pixels = np.clip(pixels, 0, [width - 1, height - 1])
        col, row = pixels.T
        x0, y0 = np.floor(col).astype(np.intp), np.floor(row).astype(np.intp)
        x1, y1 = np.minimum(x0 + 1, width - 1), np.minimum(y0 + 1, height - 1)
        dx, dy = col - x0, row - y0
        values = np.stack(
            (self._grid[y0, x0], self._grid[y0, x1], self._grid[y1, x0], self._grid[y1, x1])
        )
        weights = np.stack(((1 - dx) * (1 - dy), dx * (1 - dy), (1 - dx) * dy, dx * dy))
        if self._nodata is not None:
            valid &= ~np.any((values == self._nodata) & (weights > _PIXEL_TOLERANCE), axis=0)
        result = np.sum(values * weights, axis=0)
        result[~valid] = np.nan
        return result

    def far_horizon(
        self, origin: LonLat, eye_height_m: float, azimuths: FloatArray, max_km: float = 40
    ) -> tuple[FloatArray, FloatArray]:
        angles = np.asarray(azimuths, dtype=np.float64)
        if angles.ndim != 1 or not np.all(np.isfinite(angles)) or max_km <= 0:
            raise ValueError("Expected finite 1D azimuths and positive range")
        if not np.isfinite(eye_height_m) or not np.isfinite(max_km):
            raise ValueError("Eye elevation and range must be finite")
        key = (origin.lon, origin.lat, eye_height_m, angles.tobytes(), max_km)
        if key not in self._cache:
            self._cache[key] = self._calculate_horizon(origin, eye_height_m, angles, max_km)
            if len(self._cache) > self._cache_size:
                self._cache.popitem(last=False)
        self._cache.move_to_end(key)
        horizon, distances = self._cache[key]
        return horizon.copy(), distances.copy()

    def _calculate_horizon(
        self, origin: LonLat, eye_m: float, azimuths: FloatArray, max_km: float
    ) -> tuple[FloatArray, FloatArray]:
        distances = np.arange(self._step_m, max_km * 1000, self._step_m, dtype=np.float64)
        distances = np.append(distances, max_km * 1000)
        xy = ray_coordinates(np.zeros(2), azimuths, distances)
        points = LocalProjection(origin).inverse(xy)
        heights = self.elevation(points.reshape(-1, 2)).reshape(points.shape[:-1])
        angles = elevation_angle(heights, distances, eye_m)
        valid = np.isfinite(angles)
        indices = np.argmax(np.where(valid, angles, -np.inf), axis=1)
        horizon = np.take_along_axis(angles, indices[:, None], axis=1)[:, 0]
        horizon_distances = distances[indices]
        missing = ~np.all(valid, axis=1)
        horizon[missing] = np.nan
        horizon_distances[missing] = np.nan
        return horizon, horizon_distances
