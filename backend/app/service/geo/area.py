from typing import cast

import numpy as np

from app.domain.geo.projection import LocalProjection
from app.domain.geo.slopes import SlopeSample, SlopeStat, slope_stat, terrain_slopes
from app.domain.geo.types import LonLat
from app.service.ports import AreaSlopes
from app.service.recipes.executor import Environment, NoDataError

_GRID_STEP_M = 60.0
_PROBE_STEP_M = 30.0


def slopes_near(env: Environment, origin: LonLat, radius_m: float) -> SlopeStat:
    sampler = cast(AreaSlopes | None, env.extras.get("area_slopes"))
    if sampler is not None and (stat := sampler.within(origin, radius_m)) is not None:
        return stat
    if env.terrain is None:
        raise NoDataError("нет пешеходного графа и рельефа для уклонов")
    axis = np.arange(-radius_m, radius_m + _GRID_STEP_M / 2, _GRID_STEP_M)
    xx, yy = np.meshgrid(axis, axis)
    xy = np.column_stack((xx.ravel(), yy.ravel()))
    xy = xy[np.linalg.norm(xy, axis=1) <= radius_m]
    if not len(xy):
        xy = np.zeros((1, 2))
    projection = LocalProjection(origin)
    offsets = np.array([[-1, 0], [1, 0], [0, -1], [0, 1]]) * _PROBE_STEP_M
    probes = projection.inverse((xy[:, None, :] + offsets).reshape(-1, 2))
    heights = env.terrain.elevation(probes).reshape(-1, 4)
    slopes = terrain_slopes(xy, heights, step_m=_PROBE_STEP_M)
    samples = tuple(
        SlopeSample(((float(point[0]), float(point[1])),), float(slope))
        for point, slope in zip(projection.inverse(xy), slopes, strict=True)
        if np.isfinite(slope)
    )
    if not samples:
        raise NoDataError("нет покрытия рельефа в радиусе")
    return slope_stat(samples, estimated=True)
