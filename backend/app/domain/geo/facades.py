from dataclasses import dataclass
from math import atan2, cos, degrees, hypot, radians

from shapely import Point, Polygon

from app.domain.knowledge.scope import Facade

type XY = tuple[float, float]
FLOOR_HEIGHT_M = 3.0
_MIN_VERTICES = 3
_RIGHT_ANGLE_DEG = 90


@dataclass(frozen=True, slots=True)
class Wall:
    """One contiguous exterior facade in local metres; azimuth clockwise from north."""

    start: XY
    end: XY
    azimuth_deg: float
    facade: Facade

    @property
    def length_m(self) -> float:
        return hypot(self.end[0] - self.start[0], self.end[1] - self.start[1])

    def point(self, fraction: float) -> XY:
        if not 0 <= fraction <= 1:
            raise ValueError("Window fraction must be within 0..1")
        return (
            self.start[0] + fraction * (self.end[0] - self.start[0]),
            self.start[1] + fraction * (self.end[1] - self.start[1]),
        )


@dataclass(frozen=True, slots=True)
class Window:
    wall: Wall
    floor: int
    fraction: float
    xy: XY
    elevation_m: float


def extract_facades(footprint: Polygon, *, tolerance_deg: float = 5.0) -> tuple[Wall, ...]:
    """Exterior footprint in local metres → contiguous walls; courtyards are excluded."""
    if footprint.is_empty or not footprint.is_valid or footprint.area <= 0:
        raise ValueError("Expected a valid nonempty building polygon")
    if not 0 <= tolerance_deg < _RIGHT_ANGLE_DEG:
        raise ValueError("Collinearity tolerance must be within 0..90 degrees")
    vertices = [(float(x), float(y)) for x, y, *_ in footprint.exterior.coords][:-1]
    if not footprint.exterior.is_ccw:
        vertices.reverse()
    vertices = _merge_collinear(vertices, tolerance_deg)
    walls = []
    for start, end in zip(vertices, [*vertices[1:], vertices[0]], strict=True):
        dx, dy = end[0] - start[0], end[1] - start[1]
        azimuth = degrees(atan2(dy, -dx)) % 360
        walls.append(Wall(start, end, azimuth, Facade.from_azimuth(azimuth)))
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
                candidate = vertices[:i] + vertices[i + 1 :]
                # A near-collinear concave notch must not place windows inside the building.
                midpoint = Point((previous[0] + following[0]) / 2, (previous[1] + following[1]) / 2)
                if length == 0 or not Polygon(vertices).contains(midpoint):
                    vertices = candidate
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
    """Windows on each wall/floor, absolute eye elevation = base + (floor − 0.5) × 3 m."""
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
