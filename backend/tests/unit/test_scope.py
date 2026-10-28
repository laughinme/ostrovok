from typing import get_args

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.api.schemas.knowledge import FacadeName
from app.domain.knowledge.scope import (
    MONTHS,
    Cell,
    Facade,
    Grid,
    InvalidScopeError,
    Scope,
    compress,
)

GRID = Grid(facades=(Facade.NE, Facade.SW), floors=6)


def test_key_is_canonical_regardless_of_order() -> None:
    a = Scope(facades=frozenset({Facade.W, Facade.SW}), floor_from=4, months=frozenset({11, 3}))
    b = Scope(facades=frozenset({Facade.SW, Facade.W}), floor_from=4, months=frozenset({3, 11}))

    assert a.key == b.key == "f=SW,W|fl=4-*|m=3,11|rt=*"
    assert Scope.everywhere().key == "f=*|fl=*|m=*|rt=*"


@pytest.mark.parametrize(
    ("degrees", "facade"),
    [(0, Facade.N), (44, Facade.NE), (225, Facade.SW), (337.6, Facade.N), (-90, Facade.W)],
)
def test_facade_from_azimuth(degrees: float, facade: Facade) -> None:
    assert Facade.from_azimuth(degrees) is facade


@pytest.mark.parametrize(
    "kwargs",
    [
        {"floor_from": 0},
        {"floor_from": 5, "floor_to": 3},
        {"months": frozenset({13})},
        {"facades": frozenset()},
    ],
)
def test_invalid_scopes_are_refused(kwargs: dict[str, object]) -> None:
    with pytest.raises(InvalidScopeError):
        Scope(**kwargs)  # type: ignore[arg-type]


def test_scope_expands_to_its_cells() -> None:
    scope = Scope(facades=frozenset({Facade.SW}), floor_from=4)

    cells = set(scope.cells(GRID))

    assert len(cells) == 3 * 12
    assert Cell(Facade.SW, 4, 11) in cells
    assert Cell(Facade.NE, 4, 11) not in cells


def test_uniform_grid_compresses_to_one_scope() -> None:
    values = dict.fromkeys(GRID.cells(), True)

    assert compress(values, GRID) == [(Scope.everywhere(), True)]


def test_sea_from_fourth_floor_on_one_side() -> None:
    values = {c: c.facade is Facade.SW and c.floor >= 4 for c in GRID.cells()}

    result = dict(compress(values, GRID))

    assert result[Scope(facades=frozenset({Facade.SW}), floor_from=4)] is True
    assert set(result.values()) == {True, False}
    assert len(result) <= 3


@settings(max_examples=60, deadline=None)
@given(st.data())
def test_compression_is_exact(data: st.DataObject) -> None:
    """Every cell keeps its value after compression, and scopes never overlap."""
    floors = data.draw(st.integers(1, 5))
    grid = Grid(facades=(Facade.N, Facade.S, Facade.W), floors=floors)
    split_floor = data.draw(st.integers(1, floors))
    months = data.draw(st.sets(st.sampled_from(MONTHS)))
    values = {
        c: (c.facade is Facade.S and c.floor >= split_floor) or c.month in months
        for c in grid.cells()
    }

    covered: dict[Cell, bool] = {}
    for scope, value in compress(values, grid):
        for cell in scope.cells(grid):
            assert cell not in covered
            covered[cell] = value

    assert covered == values


def test_openapi_facade_names_match_the_domain() -> None:
    assert set(get_args(FacadeName)) == {f.value for f in Facade}
