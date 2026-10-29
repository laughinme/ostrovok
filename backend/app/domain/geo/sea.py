from collections.abc import Sequence

import numpy as np

from app.domain.geo.facades import FLOOR_HEIGHT_M
from app.domain.geo.horizon import batch_horizon
from app.domain.geo.scene import Scene


def minimum_floor(
    scenes: Sequence[Scene],
    base_elevation_m: float,
    floors: int,
    *,
    min_fraction: float = 0.01,
) -> int | None:
    if floors < 1 or not 0 < min_fraction <= 1 or not scenes:
        raise ValueError("Expected scenes, positive floor count and fraction within (0,1]")
    eyes = base_elevation_m + (np.arange(1, floors + 1) - 0.5) * FLOOR_HEIGHT_M
    for floor, eye in enumerate(eyes, start=1):
        for scene in scenes:
            horizon = batch_horizon(scene, np.array([eye]))
            if float(np.mean(horizon.sea_visible)) >= min_fraction:
                return floor
    return None
