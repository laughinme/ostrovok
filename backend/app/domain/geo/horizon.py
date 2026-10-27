import numpy as np

from app.domain.geo.earth import CURVATURE, elevation_angle
from app.domain.geo.projection import FloatArray
from app.domain.geo.scene import Horizon, IntArray, Obstacle, Scene

_ANGLE_EPSILON = 1e-8


def roof_events(
    scene: Scene, eyes_m: FloatArray, roofs_m: FloatArray
) -> tuple[IntArray, FloatArray, FloatArray]:
    """Roof angle extrema at interval ends and internal tangent; arrays (runs, 3*hits)."""
    hits = scene.hits
    stationary = np.sqrt(np.maximum(eyes_m[:, None] - roofs_m, 0) / CURVATURE)
    stationary = np.clip(stationary, hits.near_m, hits.far_m)
    shape = roofs_m.shape
    distances = np.concatenate(
        (np.broadcast_to(hits.near_m, shape), np.broadcast_to(hits.far_m, shape), stationary),
        axis=1,
    )
    tops = np.tile(roofs_m, (1, 3))
    return np.tile(hits.ray, 3), distances, elevation_angle(tops, distances, eyes_m[:, None])


def batch_horizon(
    scene: Scene,
    eyes_m: FloatArray,
    *,
    roofs_m: FloatArray | None = None,
    terrain_bias_m: FloatArray | None = None,
) -> Horizon:
    """Vectorized (runs,rays) profiles; absolute eyes/roofs and correlated DEM bias per run."""
    eyes = np.asarray(eyes_m, dtype=np.float64)
    if eyes.ndim != 1 or not len(eyes) or not np.all(np.isfinite(eyes)):
        raise ValueError("Expected a nonempty finite 1D array of eye elevations")
    roofs = (
        np.broadcast_to(scene.hits.roof_m, (len(eyes), len(scene.hits.ray)))
        if roofs_m is None
        else roofs_m
    )
    bias = np.zeros(len(eyes)) if terrain_bias_m is None else terrain_bias_m
    if roofs.shape != (len(eyes), len(scene.hits.ray)) or bias.shape != eyes.shape:
        raise ValueError("Roof elevations and terrain biases must match runs and hits")
    heights = np.where(scene.sea[None], 0, scene.terrain_m[None] + bias[:, None, None])
    angles = elevation_angle(heights, scene.distances_m, eyes[:, None, None])
    land = np.where(scene.sea[None], -np.inf, angles)
    roof_grid = _roof_grid(scene, eyes, roofs, angles.shape)
    obstruction = np.maximum(
        np.maximum.accumulate(land, axis=2), np.maximum.accumulate(roof_grid, axis=2)
    )
    visible = scene.sea[None] & (angles > obstruction + _ANGLE_EPSILON)
    building, terrain = np.max(roof_grid, axis=2), np.max(land, axis=2)
    sea = np.max(np.where(scene.sea[None], angles, -np.inf), axis=2)
    choices = np.stack((building, terrain, sea))
    maximum = np.max(choices, axis=0)
    kind = np.argmax(choices, axis=0).astype(np.int8)
    kind[np.isneginf(maximum)] = Obstacle.SKY
    kind[np.isnan(maximum)] = Obstacle.UNKNOWN
    return Horizon(
        maximum,
        kind,
        building,
        terrain,
        np.min(np.where(visible, angles, np.inf), axis=2),
        np.max(np.where(visible, angles, -np.inf), axis=2),
        np.any(visible, axis=2),
    )


def _roof_grid(
    scene: Scene, eyes: FloatArray, roofs: FloatArray, shape: tuple[int, ...]
) -> FloatArray:
    rows, distances, angles = roof_events(scene, eyes, roofs)
    bins = np.searchsorted(scene.distances_m, distances, side="left")
    angles = np.where(distances <= scene.distances_m[-1], angles, -np.inf)
    bins = np.minimum(bins, len(scene.distances_m) - 1)
    grid = np.full(shape, -np.inf)
    np.maximum.at(grid, (np.arange(len(eyes))[:, None], rows[None], bins), angles)
    return grid


def evaluate_horizon(scene: Scene, eye_m: float) -> Horizon:
    """Nominal profile for one fixed window; all elevations absolute in metres."""
    return batch_horizon(scene, np.array([eye_m], dtype=np.float64)).row(0)
