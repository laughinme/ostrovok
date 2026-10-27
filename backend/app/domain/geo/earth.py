import numpy as np

from app.domain.geo.projection import EARTH_RADIUS_M, FloatArray

REFRACTION = 0.13
CURVATURE = (1 - REFRACTION) / (2 * EARTH_RADIUS_M)


def curvature_drop(distances_m: FloatArray) -> FloatArray:
    """Effective earth drop in metres, standard terrestrial refraction k=0.13."""
    return CURVATURE * distances_m**2


def elevation_angle(heights_m: FloatArray, distances_m: FloatArray, eye_m: float) -> FloatArray:
    """Apparent terrain/roof angle in degrees; all elevations absolute, distances positive."""
    return np.degrees(np.arctan2(heights_m - eye_m - curvature_drop(distances_m), distances_m))


def ray_coordinates(origin: FloatArray, azimuths: FloatArray, distances: FloatArray) -> FloatArray:
    """Local x/y metres for every (azimuth degrees from north, distance metres)."""
    radians = np.radians(azimuths)
    directions = np.column_stack((np.sin(radians), np.cos(radians)))
    return origin[None, None, :] + directions[:, None, :] * distances[None, :, None]
