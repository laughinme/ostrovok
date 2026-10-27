from collections.abc import Sequence
from dataclasses import replace

import numpy as np
from shapely import STRtree, get_coordinates, line_interpolate_point, points

from app.domain.geo.projection import FloatArray
from app.domain.geo.scene import Building


def ground_probe_points(buildings: Sequence[Building]) -> FloatArray:
    """32 probes on a 35 m buffered perimeter, for a low-quantile DSM ground proxy."""
    rings = np.array(
        [building.footprint.buffer(35).boundary for building in buildings], dtype=object
    )
    probes = line_interpolate_point(
        rings[:, None], np.linspace(0, 1, 32, endpoint=False)[None], normalized=True
    )
    return np.asarray(get_coordinates(probes), dtype=np.float64).reshape(len(buildings), 32, 2)


def estimate_bases(
    buildings: Sequence[Building], probe_heights_m: FloatArray
) -> tuple[Building, ...]:
    """20th percentile of finite perimeter DSM samples; not a bare-earth terrain model."""
    if probe_heights_m.shape != (len(buildings), 32) or not np.all(np.isfinite(probe_heights_m)):
        raise ValueError("Expected 32 finite ground probes per building")
    bases = np.quantile(probe_heights_m, 0.2, axis=1)
    return tuple(
        replace(b, base_elevation_m=float(base)) for b, base in zip(buildings, bases, strict=True)
    )


def correct_dsm(xy: FloatArray, heights_m: FloatArray, buildings: Sequence[Building]) -> FloatArray:
    """Lower DSM in building footprints + 20 m halo before explicit OSM extrusion."""
    if xy.shape[:-1] != heights_m.shape:
        raise ValueError("DSM heights must match point coordinates")
    result = heights_m.copy().reshape(-1)
    if buildings:
        tree = STRtree([b.footprint.buffer(20) for b in buildings])
        sample_ids, building_ids = tree.query(points(xy.reshape(-1, 2)), predicate="within")
        bases = np.array([b.base_elevation_m for b in buildings])
        np.minimum.at(result, sample_ids, bases[building_ids])
    return result.reshape(heights_m.shape)
