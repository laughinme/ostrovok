from collections.abc import Sequence
from dataclasses import dataclass
from math import atan2, degrees, hypot

import numpy as np

from app.domain.geo.earth import elevation_angle
from app.domain.geo.facades import XY
from app.domain.geo.horizon import roof_events
from app.domain.geo.projection import FloatArray
from app.domain.geo.scene import BoolArray, Horizon, Obstacle, Scene

_HALF_CIRCLE_DEG = 180


@dataclass(frozen=True, slots=True)
class Peak:
    ref: str
    name: str | None
    xy: XY
    elevation_m: float


@dataclass(frozen=True, slots=True)
class VisiblePeak:
    ref: str
    name: str | None
    distance_m: float
    azimuth_deg: float
    elevation_deg: float


def visible_peaks(scene: Scene, eye_m: float, peaks: Sequence[Peak]) -> tuple[VisiblePeak, ...]:
    land_angles = elevation_angle(scene.terrain_m, scene.distances_m, eye_m)
    land_angles = np.where(scene.sea, -np.inf, land_angles)
    rows, roof_distances, roof_angles = roof_events(
        scene, np.array([eye_m]), scene.hits.roof_m[None]
    )
    result = []
    for peak in peaks:
        dx, dy = peak.xy[0] - scene.origin_xy[0], peak.xy[1] - scene.origin_xy[1]
        distance = hypot(dx, dy)
        if distance <= 0 or distance > scene.distances_m[-1] or not np.isfinite(peak.elevation_m):
            continue
        azimuth = degrees(atan2(dx, dy)) % 360
        offsets = (scene.azimuths_deg - azimuth + 180) % 360 - 180
        ray = int(np.argmin(np.abs(offsets)))
        if not _inside_sector(azimuth, scene):
            continue
        before = scene.distances_m < distance
        terrain = float(np.max(land_angles[ray, before], initial=-np.inf))
        roof = float(
            np.max(roof_angles[0, (rows == ray) & (roof_distances[0] < distance)], initial=-np.inf)
        )
        angle = float(elevation_angle(np.array(peak.elevation_m), np.array(distance), eye_m))
        if not np.isnan(terrain) and angle > max(terrain, roof):
            result.append(VisiblePeak(peak.ref, peak.name, distance, azimuth, angle))
    return tuple(sorted(result, key=lambda p: p.distance_m))


def _inside_sector(azimuth: float, scene: Scene) -> bool:
    unwrapped = np.degrees(np.unwrap(np.radians(scene.azimuths_deg)))
    centre = (unwrapped[0] + unwrapped[-1]) / 2
    target = centre + (azimuth - centre + _HALF_CIRCLE_DEG) % 360 - _HALF_CIRCLE_DEG
    return bool(unwrapped[0] <= target <= unwrapped[-1])


def mountain_visibility(
    scene: Scene,
    eyes_m: FloatArray,
    profiles: Horizon,
    *,
    terrain_bias_m: FloatArray | None = None,
) -> BoolArray:
    bias = np.zeros(len(eyes_m)) if terrain_bias_m is None else terrain_bias_m
    heights = scene.terrain_m[None] + bias[:, None, None]
    angles = elevation_angle(heights, scene.distances_m, eyes_m[:, None, None])
    indices = np.argmax(np.where(scene.sea[None], -np.inf, angles), axis=2)
    elevations = np.take_along_axis(heights, indices[:, :, None], axis=2)[:, :, 0]
    return np.asarray((profiles.kind == Obstacle.TERRAIN) & (elevations >= 500), dtype=np.bool_)
