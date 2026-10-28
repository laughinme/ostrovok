from datetime import date
from uuid import uuid4

import pytest

from app.core.errors import DomainError
from app.domain.knowledge.scope import Facade, Scope
from app.domain.search.compare import Selection, validate_selections
from app.domain.search.intent import Intent
from app.domain.search.score import Variant
from app.domain.search.trip import TripDraft
from app.service.search.search import trip_window


def test_comparison_selection_restricts_the_requested_room_facade_and_floor() -> None:
    selection = Selection(uuid4(), "suite", Facade.S, 5)
    variants = selection.variants(
        [
            Variant(Scope(facades=frozenset({Facade.S}), floor_from=4, floor_to=6), "suite"),
            Variant(Scope(facades=frozenset({Facade.N}), floor_from=4, floor_to=6), "suite"),
            Variant(Scope(facades=frozenset({Facade.S}), floor_from=4, floor_to=6), "other"),
        ]
    )
    assert len(variants) == 1
    assert variants[0].scope == Scope(facades=frozenset({Facade.S}), floor_from=5, floor_to=5)
    with pytest.raises(DomainError):
        validate_selections([selection, selection])


def test_search_and_comparison_exclude_checkout_month() -> None:
    intent = Intent(
        None, (), TripDraft(check_in=date(2026, 11, 29), check_out=date(2026, 12, 1)), ()
    )
    assert trip_window(intent).months == {11}
