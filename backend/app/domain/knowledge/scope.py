from collections.abc import Iterable, Iterator, Mapping
from dataclasses import dataclass
from enum import StrEnum
from itertools import groupby, product
from typing import Self

from app.core.errors import DomainError, ErrorCode


class InvalidScopeError(DomainError):
    error_code = ErrorCode.INVALID_SCOPE
    default_detail = "Invalid scope"


class Facade(StrEnum):
    """Compass direction of a wall's outward normal, 8 points."""

    N = "N"
    NE = "NE"
    E = "E"
    SE = "SE"
    S = "S"
    SW = "SW"
    W = "W"
    NW = "NW"

    @property
    def azimuth(self) -> float:
        return _AZIMUTHS[self]

    @classmethod
    def from_azimuth(cls, degrees: float) -> "Facade":
        index = round((degrees % 360) / 45) % 8
        return _ORDER[index]


_ORDER = tuple(Facade)
_AZIMUTHS: Mapping[Facade, float] = {facade: 45.0 * i for i, facade in enumerate(_ORDER)}
MONTHS = tuple(range(1, 13))


@dataclass(frozen=True, slots=True)
class Cell:
    facade: Facade
    floor: int
    month: int


@dataclass(frozen=True, slots=True)
class Grid:
    facades: tuple[Facade, ...]
    floors: int

    def cells(self) -> Iterator[Cell]:
        for facade, floor, month in product(self.facades, range(1, self.floors + 1), MONTHS):
            yield Cell(facade, floor, month)


@dataclass(frozen=True, slots=True)
class Scope:
    facades: frozenset[Facade] | None = None
    floor_from: int | None = None
    floor_to: int | None = None
    months: frozenset[int] | None = None
    room_types: frozenset[str] | None = None

    def __post_init__(self) -> None:
        if self.floor_from is not None and self.floor_from < 1:
            raise InvalidScopeError("floor_from must be at least 1")
        if (
            self.floor_from is not None
            and self.floor_to is not None
            and self.floor_to < self.floor_from
        ):
            raise InvalidScopeError("floor_to is below floor_from")
        if self.months is not None and not self.months <= set(MONTHS):
            raise InvalidScopeError("months must be within 1..12")
        for name in ("facades", "months", "room_types"):
            value = getattr(self, name)
            if value is not None and not value:
                raise InvalidScopeError(f"{name} must be omitted instead of empty")

    @classmethod
    def everywhere(cls) -> Self:
        return cls()

    @property
    def key(self) -> str:
        facades = ",".join(f.value for f in _ORDER if self.facades and f in self.facades)
        months = ",".join(str(m) for m in sorted(self.months or ()))
        rooms = ",".join(sorted(self.room_types or ()))
        floors = (
            "*"
            if self.floor_from is None and self.floor_to is None
            else f"{self.floor_from or 1}-{self.floor_to or '*'}"
        )
        return f"f={facades or '*'}|fl={floors}|m={months or '*'}|rt={rooms or '*'}"

    def contains(self, cell: Cell) -> bool:
        return (
            (self.facades is None or cell.facade in self.facades)
            and (self.floor_from is None or cell.floor >= self.floor_from)
            and (self.floor_to is None or cell.floor <= self.floor_to)
            and (self.months is None or cell.month in self.months)
        )

    def cells(self, grid: Grid) -> Iterator[Cell]:
        return (cell for cell in grid.cells() if self.contains(cell))


def encloses(outer: Scope, inner: Scope) -> bool:
    if (outer.floor_from or 1) > (inner.floor_from or 1):
        return False
    if outer.floor_to is not None and (inner.floor_to is None or inner.floor_to > outer.floor_to):
        return False
    for name in ("facades", "months", "room_types"):
        broad, narrow = getattr(outer, name), getattr(inner, name)
        if broad is not None and (narrow is None or not narrow <= broad):
            return False
    return True


def compress[V](values: Mapping[Cell, V], grid: Grid) -> list[tuple[Scope, V]]:
    if not values:
        return []
    by_value: dict[V, list[Cell]] = {}
    for cell, value in values.items():
        by_value.setdefault(value, []).append(cell)
    if len(by_value) == 1:
        (value,) = by_value
        return [(_covering_scope(values.keys(), grid), value)]

    result: list[tuple[Scope, V]] = []
    for months, month_cells in _month_blocks(values):
        for facade, facade_cells in groupby(
            sorted(month_cells, key=lambda c: (_ORDER.index(c.facade), c.floor)),
            key=lambda c: c.facade,
        ):
            floors = sorted({c.floor for c in facade_cells})
            for start, end, value in _floor_runs(floors, values, facade, months):
                result.append(
                    (
                        Scope(
                            facades=frozenset({facade}),
                            floor_from=start,
                            floor_to=None if end == grid.floors else end,
                            months=None if months == frozenset(MONTHS) else months,
                        ),
                        value,
                    )
                )
    return _merge_facades(result)


def _covering_scope(cells: Iterable[Cell], grid: Grid) -> Scope:
    cells = list(cells)
    facades = frozenset(c.facade for c in cells)
    months = frozenset(c.month for c in cells)
    floors = [c.floor for c in cells]
    return Scope(
        facades=None if facades == frozenset(grid.facades) else facades,
        floor_from=None if min(floors) == 1 else min(floors),
        floor_to=None if max(floors) == grid.floors else max(floors),
        months=None if months == frozenset(MONTHS) else months,
    )


def _month_blocks[V](values: Mapping[Cell, V]) -> list[tuple[frozenset[int], list[Cell]]]:
    patterns: dict[tuple[tuple[Facade, int, V], ...], set[int]] = {}
    for month in MONTHS:
        pattern = tuple(
            sorted(
                ((c.facade, c.floor, v) for c, v in values.items() if c.month == month),
                key=lambda item: (_ORDER.index(item[0]), item[1]),
            )
        )
        if pattern:
            patterns.setdefault(pattern, set()).add(month)
    blocks = []
    for pattern, months in patterns.items():
        first = min(months)
        blocks.append((frozenset(months), [Cell(f, floor, first) for f, floor, _ in pattern]))
    return blocks


def _floor_runs[V](
    floors: list[int], values: Mapping[Cell, V], facade: Facade, months: frozenset[int]
) -> list[tuple[int, int, V]]:
    month = min(months)
    runs: list[tuple[int, int, V]] = []
    for floor in floors:
        value = values[Cell(facade, floor, month)]
        if runs and runs[-1][2] == value and runs[-1][1] == floor - 1:
            runs[-1] = (runs[-1][0], floor, value)
        else:
            runs.append((floor, floor, value))
    return runs


def _merge_facades[V](items: list[tuple[Scope, V]]) -> list[tuple[Scope, V]]:
    merged: dict[tuple[int | None, int | None, frozenset[int] | None, V], set[Facade]] = {}
    for scope, value in items:
        key = (scope.floor_from, scope.floor_to, scope.months, value)
        merged.setdefault(key, set()).update(scope.facades or ())
    return [
        (
            Scope(
                facades=frozenset(facades),
                floor_from=None if floor_from == 1 else floor_from,
                floor_to=floor_to,
                months=months,
            ),
            value,
        )
        for (floor_from, floor_to, months, value), facades in merged.items()
    ]


def scope_to_json(scope: Scope) -> dict[str, object]:
    data: dict[str, object] = {}
    if scope.facades:
        data["facades"] = [f.value for f in _ORDER if f in scope.facades]
    if scope.floor_from is not None:
        data["floorFrom"] = scope.floor_from
    if scope.floor_to is not None:
        data["floorTo"] = scope.floor_to
    if scope.months:
        data["months"] = sorted(scope.months)
    if scope.room_types:
        data["roomTypeIds"] = sorted(scope.room_types)
    return data


def scope_from_json(data: Mapping[str, object]) -> Scope:
    def items(name: str) -> list[object] | None:
        value = data.get(name)
        return list(value) if isinstance(value, list | tuple) and value else None

    facades = items("facades")
    months = items("months")
    rooms = items("roomTypeIds")
    floor_from, floor_to = data.get("floorFrom"), data.get("floorTo")
    return Scope(
        facades=frozenset(Facade(str(f)) for f in facades) if facades else None,
        floor_from=int(str(floor_from)) if floor_from is not None else None,
        floor_to=int(str(floor_to)) if floor_to is not None else None,
        months=frozenset(int(str(m)) for m in months) if months else None,
        room_types=frozenset(str(r) for r in rooms) if rooms else None,
    )
