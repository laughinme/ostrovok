from dataclasses import dataclass
from itertools import pairwise
from math import atan2, cos, degrees, hypot, radians

from shapely import Polygon

from app.domain.knowledge.scope import Facade

type XY = tuple[float, float]
FLOOR_HEIGHT_M = 3.0
_MIN_VERTICES = 3
_RIGHT_ANGLE_DEG = 90


@dataclass(frozen=True, slots=True)
class Wall:
    start: XY
    end: XY
    azimuth_deg: float
    facade: Facade
    path: tuple[XY, ...] = ()

    @property
    def vertices(self) -> tuple[XY, ...]:
        return self.path or (self.start, self.end)

    @property
    def length_m(self) -> float:
        return sum(hypot(b[0] - a[0], b[1] - a[1]) for a, b in pairwise(self.vertices))

    def point(self, fraction: float) -> XY:
        if not 0 <= fraction <= 1:
            raise ValueError("Window fraction must be within 0..1")
        remaining = fraction * self.length_m
        for start, end in pairwise(self.vertices):
            length = hypot(end[0] - start[0], end[1] - start[1])
            if length > 0 and remaining <= length:
                share = remaining / length
                return (
                    start[0] + share * (end[0] - start[0]),
                    start[1] + share * (end[1] - start[1]),
                )
            remaining -= length
        return self.end


@dataclass(frozen=True, slots=True)
class Window:
    wall: Wall
    floor: int
    fraction: float
    xy: XY
    elevation_m: float


def extract_facades(footprint: Polygon, *, tolerance_deg: float = 5.0) -> tuple[Wall, ...]:
    if footprint.is_empty or not footprint.is_valid or footprint.area <= 0:
        raise ValueError("Expected a valid nonempty building polygon")
    if not 0 <= tolerance_deg < _RIGHT_ANGLE_DEG:
        raise ValueError("Collinearity tolerance must be within 0..90 degrees")
    vertices = [(float(x), float(y)) for x, y, *_ in footprint.exterior.coords][:-1]
    if not footprint.exterior.is_ccw:
        vertices.reverse()
    original = vertices
    vertices = _merge_collinear(vertices.copy(), tolerance_deg)
    walls = []
    for start, end in zip(vertices, [*vertices[1:], vertices[0]], strict=True):
        dx, dy = end[0] - start[0], end[1] - start[1]
        azimuth = degrees(atan2(dy, -dx)) % 360
        first, last = original.index(start), original.index(end)
        chain = (
            original[first : last + 1] if first < last else original[first:] + original[: last + 1]
        )
        walls.append(Wall(start, end, azimuth, Facade.from_azimuth(azimuth), tuple(chain)))
    return tuple(walls)


def _merge_collinear(vertices: list[XY], tolerance_deg: float) -> list[XY]:
    threshold = cos(radians(tolerance_deg))
    changed = True
    while changed and len(vertices) > _MIN_VERTICES:
        changed = False
        for i, vertex in enumerate(vertices):
            previous, following = vertices[i - 1], vertices[(i + 1) % len(vertices)]
            a = (vertex[0] - previous[0], vertex[1] - previous[1])
            b = (following[0] - vertex[0], following[1] - vertex[1])
            length = hypot(*a) * hypot(*b)
            if length == 0 or (a[0] * b[0] + a[1] * b[1]) / length >= threshold:
                vertices = vertices[:i] + vertices[i + 1 :]
                changed = True
                break
    return vertices


def window_points(
    walls: tuple[Wall, ...],
    floors: int,
    base_elevation_m: float,
    *,
    fractions: tuple[float, ...] = (0.25, 0.5, 0.75),
    floor_height_m: float = FLOOR_HEIGHT_M,
) -> tuple[Window, ...]:
    if floors < 1 or floor_height_m <= 0:
        raise ValueError("Floor count and floor height must be positive")
    return tuple(
        Window(
            wall,
            floor,
            fraction,
            wall.point(fraction),
            base_elevation_m + (floor - 0.5) * floor_height_m,
        )
        for wall in walls
        for floor in range(1, floors + 1)
        for fraction in fractions
    )
