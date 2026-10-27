from collections.abc import Sequence

import numpy as np
from shapely import contains, points
from shapely.geometry.base import BaseGeometry

from app.domain.geo.earth import ray_coordinates
from app.domain.geo.facades import XY
from app.domain.geo.ground import correct_dsm, estimate_bases, ground_probe_points
from app.domain.geo.intersections import building_intersections
from app.domain.geo.projection import FloatArray, LocalProjection
from app.domain.geo.scene import Building, Scene, sample_distances, sector_azimuths
from app.service.ports import TerrainModel

_DSM_CORRECTION_RANGE_M = 2050


class ViewSceneBuilder:
    """Sample the terrain port once per window; callers retain scenes across floor/MC requests."""

    def __init__(
        self,
        terrain: TerrainModel,
        projection: LocalProjection,
        *,
        step_m: float = 30,
        max_km: float = 40,
    ) -> None:
        self._terrain = terrain
        self._projection = projection
        self._distances = sample_distances(step_m=step_m, max_km=max_km)

    def buildings_with_bases(self, buildings: Sequence[Building]) -> tuple[Building, ...]:
        """Estimate DSM bases once; use the same ground estimate for hotel eye elevations."""
        xy = ground_probe_points(buildings)
        heights = self._sample(xy)
        return estimate_bases(buildings, heights)

    def prepare(
        self,
        origin_xy: XY,
        normal_deg: float,
        buildings: Sequence[Building],
        sea: BaseGeometry,
    ) -> Scene:
        """Local metres for origin/buildings/sea; includes self-occlusion and DSM correction."""
        azimuths = sector_azimuths(normal_deg)
        xy = ray_coordinates(np.array(origin_xy), azimuths, self._distances)
        terrain = self._sample(xy)
        near = self._distances <= _DSM_CORRECTION_RANGE_M
        terrain[:, near] = correct_dsm(xy[:, near], terrain[:, near], buildings)
        water = np.asarray(contains(sea, points(xy)), dtype=np.bool_)
        hits = building_intersections(
            origin_xy, azimuths, buildings, max_m=min(2000, self._distances[-1])
        )
        return Scene(azimuths, self._distances, terrain, water, hits, origin_xy, tuple(buildings))

    def _sample(self, xy: FloatArray) -> FloatArray:
        wgs84 = self._projection.inverse(xy)
        return self._terrain.elevation(wgs84.reshape(-1, 2)).reshape(xy.shape[:-1])
