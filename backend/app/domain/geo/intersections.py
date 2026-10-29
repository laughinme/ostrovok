from collections.abc import Sequence

import numpy as np
from shapely import LineString, Point, STRtree, get_parts

from app.domain.geo.earth import ray_coordinates
from app.domain.geo.facades import XY
from app.domain.geo.projection import FloatArray
from app.domain.geo.scene import Building, RoofHits

_MIN_INTERVAL_M = 1e-6


def building_intersections(
    origin_xy: XY, azimuths: FloatArray, buildings: Sequence[Building], *, max_m: float = 2000
) -> RoofHits:
    endpoints = ray_coordinates(np.array(origin_xy), azimuths, np.array([max_m]))[:, 0]
    tree = STRtree([b.footprint for b in buildings])
    observer = Point(origin_xy)
    rays, near, far, tops, indices = [], [], [], [], []
    for ray_index, endpoint in enumerate(endpoints):
        ray = LineString([origin_xy, endpoint])
        for index in tree.query(ray, predicate="intersects"):
            building = buildings[int(index)]
            for part in get_parts(ray.intersection(building.footprint)):
                if part.is_empty or part.length <= _MIN_INTERVAL_M:
                    continue
                if part.relate_pattern(building.footprint, "F********"):
                    continue
                start = float(observer.distance(part))
                end = float(np.linalg.norm(np.asarray(part.coords) - origin_xy, axis=1).max())
                rays.append(ray_index)
                near.append(max(start, _MIN_INTERVAL_M))
                far.append(max(end, _MIN_INTERVAL_M))
                tops.append(building.base_elevation_m + building.height_m)
                indices.append(int(index))
    return RoofHits(
        np.array(rays, dtype=np.int64),
        np.array(near),
        np.array(far),
        np.array(tops),
        np.array(indices, dtype=np.int64),
    )
