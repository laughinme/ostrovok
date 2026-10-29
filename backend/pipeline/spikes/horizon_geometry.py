
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from numpy.typing import NDArray
from shapely import LineString, Point, STRtree, get_parts
from shapely.geometry.polygon import orient

FloatArray = NDArray[np.float64]
CURVATURE = (1 - 0.13) / (2 * 6_371_000)
BUILDING, TERRAIN, SEA, SKY = range(4)


@dataclass(frozen=True)
class Hits:
    ray: NDArray[np.int64]
    near: FloatArray
    far: FloatArray
    roof: FloatArray


@dataclass(frozen=True)
class Scene:
    distances: FloatArray
    terrain: FloatArray
    sea: NDArray[np.bool_]
    hits: Hits


@dataclass(frozen=True)
class Horizon:
    angle: FloatArray
    kind: NDArray[np.int64]
    building: FloatArray
    terrain: FloatArray
    sea_low: FloatArray
    sea_high: FloatArray
    sea_visible: NDArray[np.bool_]

    @property
    def sea_fraction(self) -> float:
        return float(np.mean(self.sea_visible))


def elevation_angle(height: FloatArray, distance: FloatArray, eye: float) -> FloatArray:
    return np.degrees(np.arctan2(height - eye - CURVATURE * distance**2, distance))


def facade_windows(polygon: Any, sea_bearing: float) -> list[tuple[str, FloatArray, float]]:
    if polygon.geom_type != "Polygon":
        polygon = max(polygon.geoms, key=lambda part: part.area)
    coords = np.asarray(orient(polygon, sign=1).exterior.coords)
    edges = np.diff(coords, axis=0)
    lengths = np.linalg.norm(edges, axis=1)
    valid = lengths >= 3
    edges, lengths = edges[valid], lengths[valid]
    mids = (coords[:-1][valid] + coords[1:][valid]) / 2
    normals = np.column_stack((edges[:, 1], -edges[:, 0])) / lengths[:, None]
    bearings = np.degrees(np.arctan2(normals[:, 0], normals[:, 1])) % 360
    result = []
    for name, target in (("sea", sea_bearing), ("inland", (sea_bearing + 180) % 360)):
        delta = np.abs((bearings - target + 180) % 360 - 180)
        index = int(np.argmin(delta))
        result.append((name, mids[index] + normals[index] * 0.5, float(bearings[index])))
    return result


def ray_coordinates(origin: FloatArray, azimuths: FloatArray, distances: FloatArray) -> FloatArray:
    radians = np.radians(azimuths)
    directions = np.column_stack((np.sin(radians), np.cos(radians)))
    return origin[None, None, :] + directions[:, None, :] * distances[None, :, None]


def building_intersections(
    origin: FloatArray, azimuths: FloatArray, polygons: list[Any], roofs: FloatArray
) -> Hits:
    endpoints = ray_coordinates(origin, azimuths, np.array([2000.0]))[:, 0]
    tree = STRtree(polygons)
    observer = Point(origin)
    rays, near, far, tops = [], [], [], []
    for ray_index, endpoint in enumerate(endpoints):
        ray = LineString([origin, endpoint])
        for index in tree.query(ray, predicate="intersects"):
            for part in get_parts(ray.intersection(polygons[index])):
                if part.is_empty:
                    continue
                start = observer.distance(part)
                coords = np.asarray(part.coords)
                end = float(np.linalg.norm(coords - origin, axis=1).max())
                rays.append(ray_index)
                near.append(max(start, 0.01))
                far.append(max(end, 0.01))
                tops.append(roofs[index])
    return Hits(np.array(rays, dtype=np.int64), np.array(near), np.array(far), np.array(tops))


def roof_events(hits: Hits, eye: float) -> tuple[NDArray[np.int64], FloatArray, FloatArray]:
    stationary = np.sqrt(np.maximum(eye - hits.roof, 0) / CURVATURE)
    stationary = np.clip(stationary, hits.near, hits.far)
    distances = np.concatenate((hits.near, hits.far, stationary))
    rays = np.tile(hits.ray, 3)
    tops = np.tile(hits.roof, 3)
    return rays, distances, elevation_angle(tops, distances, eye)


def evaluate_horizon(scene: Scene, eye: float) -> Horizon:
    angles = elevation_angle(np.where(scene.sea, 0, scene.terrain), scene.distances, eye)
    land = np.where(scene.sea, -np.inf, angles)
    prefix_land = np.maximum.accumulate(land, axis=1)
    rows, distances, roof_angles = roof_events(scene.hits, eye)
    roof_bins = np.searchsorted(scene.distances, distances, side="left")
    roof_bins = np.minimum(roof_bins, len(scene.distances) - 1)
    roof_grid = np.full_like(angles, -np.inf)
    np.maximum.at(roof_grid, (rows, roof_bins), roof_angles)
    prefix_roof = np.maximum.accumulate(roof_grid, axis=1)
    obstruction = np.maximum(prefix_land, prefix_roof)
    visible = scene.sea & (angles > obstruction + 1e-8)
    low = np.min(np.where(visible, angles, np.inf), axis=1)
    high = np.max(np.where(visible, angles, -np.inf), axis=1)
    building = np.max(roof_grid, axis=1)
    terrain = np.max(land, axis=1)
    sea = np.max(np.where(scene.sea, angles, -np.inf), axis=1)
    choices = np.stack((building, terrain, sea))
    kind = np.argmax(choices, axis=0).astype(np.int64)
    horizon = np.max(choices, axis=0)
    kind[~np.isfinite(horizon)] = SKY
    return Horizon(horizon, kind, building, terrain, low, high, np.any(visible, axis=1))


def minimum_floor(scene: Scene, ground: float, floors: int) -> int | None:
    for floor in range(1, floors + 1):
        if evaluate_horizon(scene, ground + (floor - 0.5) * 3).sea_visible.any():
            return floor
    return None
