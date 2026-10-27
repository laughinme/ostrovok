from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

import numpy as np

from app.domain.geo.horizon import batch_horizon
from app.domain.geo.peaks import mountain_visibility
from app.domain.geo.projection import FloatArray
from app.domain.geo.scene import Building, IntArray, Scene


@dataclass(frozen=True, slots=True)
class VisibilityProbability:
    probability: float
    fractions: FloatArray
    window_indices: IntArray


def height_perturbations(
    buildings: Sequence[Building], runs: int, rng: np.random.Generator
) -> FloatArray:
    """Uniform height errors: measured ±1.5 m, levels ±1 floor, default ±2 floors."""
    sources = np.array([b.height_source for b in buildings])
    offsets: FloatArray = rng.uniform(-1.5, 1.5, size=(runs, len(buildings)))
    for source, floors in [("osm_levels", 1), ("default", 2)]:
        mask = sources == source
        offsets[:, mask] = rng.integers(-floors, floors + 1, size=(runs, int(mask.sum()))) * 3
    heights = np.array([b.height_m for b in buildings], dtype=np.float64)
    return np.maximum(heights + offsets, 0.5) - heights


def monte_carlo(
    scenes: Sequence[Scene],
    eye_m: float,
    *,
    runs: int = 16,
    min_fraction: float = 0.01,
    seed: int = 0,
    target: Literal["sea", "mountains"] = "sea",
) -> VisibilityProbability:
    """P(target fraction ≥ threshold), sampling prepared windows and uncertain heights."""
    if not scenes or runs < 1 or not 0 < min_fraction <= 1:
        raise ValueError("Expected prepared windows, positive runs and threshold within (0,1]")
    refs = tuple(b.ref for b in scenes[0].buildings)
    if any(tuple(b.ref for b in scene.buildings) != refs for scene in scenes):
        raise ValueError("All window scenes must share the same ordered buildings")
    rng = np.random.default_rng(seed)
    windows = rng.integers(0, len(scenes), size=runs, dtype=np.int64)
    offsets = height_perturbations(scenes[0].buildings, runs, rng)
    terrain_bias = rng.uniform(-2, 2, size=runs)
    fractions = np.empty(runs)
    for window_index, scene in enumerate(scenes):
        selected = np.flatnonzero(windows == window_index)
        if not len(selected):
            continue
        roof_offsets = offsets[selected][:, scene.hits.building]
        roofs = scene.hits.roof_m[None] + roof_offsets + terrain_bias[selected, None]
        profile = batch_horizon(
            scene,
            eye_m + terrain_bias[selected],
            roofs_m=roofs,
            terrain_bias_m=terrain_bias[selected],
        )
        visible = profile.sea_visible
        if target == "mountains":
            visible = mountain_visibility(
                scene,
                eye_m + terrain_bias[selected],
                profile,
                terrain_bias_m=terrain_bias[selected],
            )
        fractions[selected] = np.mean(visible, axis=1)
    return VisibilityProbability(float(np.mean(fractions >= min_fraction)), fractions, windows)
