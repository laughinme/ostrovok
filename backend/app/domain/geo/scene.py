from dataclasses import dataclass
from enum import IntEnum
from typing import Literal

import numpy as np
from numpy.typing import NDArray
from shapely import Polygon

from app.domain.geo.facades import XY
from app.domain.geo.projection import FloatArray

type HeightSource = Literal["osm_height", "osm_levels", "default"]
type IntArray = NDArray[np.int64]
type BoolArray = NDArray[np.bool_]


class Obstacle(IntEnum):
    BUILDING = 0
    TERRAIN = 1
    SEA = 2
    SKY = 3
    UNKNOWN = 4


@dataclass(frozen=True, slots=True)
class Building:
    ref: str
    footprint: Polygon
    base_elevation_m: float
    height_m: float
    height_source: HeightSource = "default"


@dataclass(frozen=True, slots=True)
class RoofHits:
    ray: IntArray
    near_m: FloatArray
    far_m: FloatArray
    roof_m: FloatArray
    building: IntArray

    @classmethod
    def empty(cls) -> "RoofHits":
        return cls(
            np.empty(0, dtype=np.int64),
            np.empty(0),
            np.empty(0),
            np.empty(0),
            np.empty(0, dtype=np.int64),
        )


@dataclass(frozen=True, slots=True)
class Scene:
    azimuths_deg: FloatArray
    distances_m: FloatArray
    terrain_m: FloatArray
    sea: BoolArray
    hits: RoofHits
    origin_xy: XY = (0.0, 0.0)
    buildings: tuple[Building, ...] = ()

    def __post_init__(self) -> None:
        shape = (len(self.azimuths_deg), len(self.distances_m))
        if self.terrain_m.shape != shape or self.sea.shape != shape:
            raise ValueError("Terrain and sea must have shape (rays, samples)")
        if (
            not all(shape)
            or np.any(self.distances_m <= 0)
            or np.any(np.diff(self.distances_m) <= 0)
        ):
            raise ValueError("Expected nonempty rays and increasing positive distances")


@dataclass(frozen=True, slots=True)
class Horizon:
    angle_deg: FloatArray
    kind: NDArray[np.int8]
    building_deg: FloatArray
    terrain_deg: FloatArray
    sea_low_deg: FloatArray
    sea_high_deg: FloatArray
    sea_visible: BoolArray

    @property
    def sea_fraction(self) -> float:
        return float(np.mean(self.sea_visible))

    def row(self, index: int) -> "Horizon":
        return Horizon(
            self.angle_deg[index],
            self.kind[index],
            self.building_deg[index],
            self.terrain_deg[index],
            self.sea_low_deg[index],
            self.sea_high_deg[index],
            self.sea_visible[index],
        )


def sector_azimuths(normal_deg: float) -> FloatArray:
    return normal_deg + np.arange(-70.0, 71.0)


def sample_distances(*, step_m: float = 30, max_km: float = 40) -> FloatArray:
    if not 30 <= step_m <= 90 or not np.isfinite(max_km) or max_km <= 0:
        raise ValueError("Expected 30..90 m sampling step and positive range")
    return np.append(np.arange(step_m, max_km * 1000, step_m, dtype=np.float64), max_km * 1000)
