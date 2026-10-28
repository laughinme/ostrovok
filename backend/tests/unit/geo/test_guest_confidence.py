from dataclasses import replace

import pytest

from app.domain.knowledge.characteristic import Level
from app.domain.knowledge.confidence import beta_update
from app.domain.knowledge.reconcile import reconcile
from app.domain.knowledge.scope import Cell, Facade, Scope
from app.domain.knowledge.sources import SourceKind
from tests.unit.test_reconcile import GRID, NOW, _characteristic, _obs


@pytest.mark.parametrize(
    ("value", "answer"), [(True, True), (True, False), (False, True), (False, False)]
)
def test_guest_feedback_uses_beta_prior_only_in_booked_cells(value: bool, answer: bool) -> None:
    characteristic = _characteristic()
    prior = _obs(Scope.everywhere(), value, 0.8)
    booked = Scope(facades=frozenset({Facade.SW}), floor_from=4, floor_to=6, months=frozenset({11}))
    guest = replace(
        _obs(booked, value if answer else not value, 1.0, SourceKind.GUEST),
        source_ref="trip:1",
        method="guest.feedback",
    )
    baseline = reconcile(characteristic, GRID, [prior], NOW).facts[0]
    result = reconcile(characteristic, GRID, [prior, guest], NOW)
    affected = next(f for f in result.facts if f.scope.contains(Cell(Facade.SW, 4, 11)))
    p = baseline.confidence if value else 1 - baseline.confidence
    expected = beta_update(p, yes=int(guest.value), no=int(not guest.value))
    assert affected.confidence == pytest.approx(max(expected, 1 - expected))
    elsewhere = next(f for f in result.facts if f.scope.contains(Cell(Facade.NE, 1, 6)))
    assert elsewhere.confidence == pytest.approx(baseline.confidence)
    assert elsewhere.value is value


@pytest.mark.parametrize("answer", [True, False])
def test_hotel_level_feedback_inherits_the_hotel_prior_for_its_room_scope(answer: bool) -> None:
    characteristic = _characteristic(level=Level.HOTEL)
    prior = _obs(Scope.everywhere(), True, 0.8)
    booked = Scope(
        floor_from=4, floor_to=6, months=frozenset({11}), room_types=frozenset({"suite"})
    )
    guest = replace(
        _obs(booked, answer, 1.0, SourceKind.GUEST), source_ref="trip:1", method="guest.feedback"
    )
    baseline = reconcile(characteristic, GRID, [prior], NOW).facts[0].confidence
    result = reconcile(characteristic, GRID, [prior, guest], NOW)
    scoped = next(f for f in result.facts if f.scope == booked)
    assert scoped.confidence == pytest.approx(
        beta_update(baseline, yes=int(answer), no=int(not answer))
    )
    assert guest.id in scoped.observation_ids
    whole_hotel = next(f for f in result.facts if f.scope == Scope.everywhere())
    assert whole_hotel.confidence == pytest.approx(baseline)
