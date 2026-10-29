from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

import numpy as np

from app.domain.geo.horizon import batch_horizon
from app.domain.geo.peaks import mountain_visibility
from app.domain.geo.projection import FloatArray
from app.domain.geo.scene import Building, Horizon, IntArray, Scene


@dataclass(frozen=True, slots=True)
class VisibilityProbability:
    probability: float
    fractions: FloatArray
    window_indices: IntArray


def height_perturbations(
    buildings: Sequence[Building], runs: int, rng: np.random.Generator
) -> FloatArray:
    sources = np.array([b.height_source for b in buildings])
    offsets: FloatArray = rng.uniform(-1.5, 1.5, size=(runs, len(buildings)))
    for source, floors in [("osm_levels", 1), ("default", 2)]:
        mask = sources == source
        offsets[:, mask] = rng.integers(-floors, floors + 1, size=(runs, int(mask.sum()))) * 3
    heights = np.array([b.height_m for b in buildings], dtype=np.float64)
    return np.maximum(heights + offsets, 0.5) - heights


@dataclass(frozen=True, slots=True)
class SampledWindow:
    scene: Scene
    indices: IntArray
    eyes_m: FloatArray
    terrain_bias_m: FloatArray
    horizon: Horizon


def sampled_horizons(
    scenes: Sequence[Scene], eye_m: float | FloatArray, *, runs: int = 16, seed: int = 0
) -> tuple[SampledWindow, ...]:
    if not scenes or runs < 1:
        raise ValueError("Expected prepared windows and positive runs")
    refs = tuple(b.ref for b in scenes[0].buildings)
    if any(tuple(b.ref for b in scene.buildings) != refs for scene in scenes):
        raise ValueError("All window scenes must share the same ordered buildings")
    eyes = np.broadcast_to(np.asarray(eye_m, dtype=np.float64), (runs,))
    if not np.all(np.isfinite(eyes)):
        raise ValueError("Expected finite eye elevations, one per run")
    rng = np.random.default_rng(seed)
    windows = rng.integers(0, len(scenes), size=runs, dtype=np.int64)
    offsets = height_perturbations(scenes[0].buildings, runs, rng)
    terrain_bias = rng.uniform(-2, 2, size=runs)
    result = []
    for window_index, scene in enumerate(scenes):
        selected = np.flatnonzero(windows == window_index)
        if not len(selected):
            continue
        roofs = (
            scene.hits.roof_m[None]
            + offsets[selected][:, scene.hits.building]
            + terrain_bias[selected, None]
        )
        eye = eyes[selected] + terrain_bias[selected]
        profile = batch_horizon(scene, eye, roofs_m=roofs, terrain_bias_m=terrain_bias[selected])
        result.append(SampledWindow(scene, selected, eye, terrain_bias[selected], profile))
    return tuple(result)


def monte_carlo(
    scenes: Sequence[Scene],
    eye_m: float | FloatArray,
    *,
    runs: int = 16,
    min_fraction: float = 0.01,
    seed: int = 0,
    target: Literal["sea", "mountains"] = "sea",
) -> VisibilityProbability:
    if not 0 < min_fraction <= 1:
        raise ValueError("Expected threshold within (0,1]")
    fractions = np.empty(runs)
    windows = np.empty(runs, dtype=np.int64)
    for sample in sampled_horizons(scenes, eye_m, runs=runs, seed=seed):
        visible = sample.horizon.sea_visible
        if target == "mountains":
            visible = mountain_visibility(
                sample.scene,
                sample.eyes_m,
                sample.horizon,
                terrain_bias_m=sample.terrain_bias_m,
            )
        fractions[sample.indices] = np.mean(visible, axis=1)
        windows[sample.indices] = next(i for i, scene in enumerate(scenes) if scene is sample.scene)
    return VisibilityProbability(float(np.mean(fractions >= min_fraction)), fractions, windows)
