"""A hotel's surroundings in local metres: the frame every facade calculation works in."""

from collections.abc import Sequence
from dataclasses import dataclass
from math import cos, radians, sin

import numpy as np
from shapely import Point, transform
from shapely.geometry.base import BaseGeometry

from app.domain.catalog import HotelGeo, footprint_in_metres
from app.domain.geo.facades import Wall, extract_facades
from app.domain.geo.projection import LocalProjection
from app.domain.knowledge.scope import Facade


@dataclass(frozen=True, slots=True)
class FacadeReceiver:
    facade: Facade
    azimuth: float
    point: Point
    wall_length_m: float


class LocalFrame:
    def __init__(self, hotel: HotelGeo) -> None:
        self.projection = LocalProjection(hotel.location)
        self.footprint = transform(hotel.footprint, self.projection.forward)
        local, _ = footprint_in_metres(hotel.footprint)
        self._walls = extract_facades(local if local.is_valid else local.buffer(0))
        # Walls come in the footprint's own centroid frame; shift them into the hotel frame.
        centroid = hotel.footprint.centroid
        self._offset = self.projection.forward(np.array([centroid.x, centroid.y]))

    def to_local(self, geometry: BaseGeometry) -> BaseGeometry:
        return transform(geometry, self.projection.forward)

    def many_to_local(self, geometries: Sequence[BaseGeometry]) -> list[BaseGeometry]:
        return [self.to_local(g) for g in geometries]

    def receivers(self, *, outward_m: float = 1.0) -> list[FacadeReceiver]:
        """One receiver per compass side: the middle of its longest wall, just outside it."""
        best: dict[Facade, Wall] = {}
        for wall in self._walls:
            if wall.facade not in best or wall.length_m > best[wall.facade].length_m:
                best[wall.facade] = wall
        result = []
        for facade, wall in best.items():
            x, y = wall.point(0.5)
            dx, dy = sin(radians(wall.azimuth_deg)), cos(radians(wall.azimuth_deg))
            point = Point(
                x + self._offset[0] + dx * outward_m, y + self._offset[1] + dy * outward_m
            )
            result.append(FacadeReceiver(facade, wall.azimuth_deg, point, wall.length_m))
        return sorted(result, key=lambda r: list(Facade).index(r.facade))
