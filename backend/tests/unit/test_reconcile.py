from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from app.domain.knowledge.characteristic import Characteristic, Level, MethodKind
from app.domain.knowledge.observation import Observation
from app.domain.knowledge.reconcile import reconcile
from app.domain.knowledge.scope import Facade, Grid, Scope
from app.domain.knowledge.sources import Authority, SourceKind
from app.domain.knowledge.statements import StatementTemplate
from app.domain.knowledge.values import ValueType

NOW = datetime(2026, 10, 28, tzinfo=UTC)
HOTEL = uuid4()
GRID = Grid(facades=(Facade.NE, Facade.SE, Facade.SW, Facade.NW), floors=8)


def _characteristic(**overrides: Any) -> Characteristic:
    values: dict[str, Any] = {
        "key": "sea_view",
        "title": "Море из окна",
        "level": Level.FACADE_FLOOR,
        "value_type": ValueType.PROBABILITY,
        "method": MethodKind.VIEW,
        "recipe": {"kind": "view", "target": "sea"},
        "ttl_days": 365,
        "authority": Authority.PHYSICS,
        "statement": StatementTemplate(yes="Море видно", no="Моря не видно"),
    }
    values.update(overrides)
    return Characteristic(**values)


def _obs(
    scope: Scope,
    value: Any,
    confidence: float,
    source: SourceKind = SourceKind.COMPUTED,
    *,
    ref: str = "method:view@1",
    at: datetime = NOW,
) -> Observation:
    return Observation(
        hotel_id=HOTEL,
        characteristic="sea_view",
        characteristic_version=1,
        scope=scope,
        value=value,
        confidence=confidence,
        source=source,
        source_ref=ref,
        method="test",
        observed_at=at,
        valid_until=at + timedelta(days=365),
    )


def _side(facade: Facade, **kwargs: Any) -> Scope:
    return Scope(facades=frozenset({facade}), **kwargs)


def test_mayak_physics_beats_the_description() -> None:
    computed = [
        _obs(_side(Facade.SW, floor_from=4), True, 0.82),
        _obs(_side(Facade.SW, floor_to=3), False, 0.9),
        _obs(_side(Facade.NE), False, 0.95),
        _obs(_side(Facade.SE), False, 0.9),
        _obs(_side(Facade.NW), False, 0.9),
    ]
    claim = _obs(Scope.everywhere(), True, 0.9, SourceKind.HOTELIER, ref="answer:1")

    result = reconcile(_characteristic(), GRID, [*computed, claim], NOW)

    by_scope = {f.scope: f for f in result.facts}
    sw_top = by_scope[_side(Facade.SW, floor_from=4)]
    assert sw_top.value is True
    assert sw_top.confidence > 0.82
    assert all(f.value is False for s, f in by_scope.items() if s != sw_top.scope)
    assert result.conflict is not None
    assert result.conflict.rule is Authority.PHYSICS
    assert result.conflict.facades == {Facade.NE, Facade.SE, Facade.NW, Facade.SW}
    assert result.conflict.cells == (3 * 8 + 3) * 12
    assert result.conflict.waits_for_hotel


def test_hotelier_wins_for_house_rules() -> None:
    characteristic = _characteristic(
        key="pets_policy", level=Level.HOTEL, authority=Authority.HOTELIER
    )
    card = _obs(Scope.everywhere(), False, 0.9, SourceKind.DEMO_CARD, ref="card:1")
    answer = _obs(Scope.everywhere(), True, 0.85, SourceKind.HOTELIER, ref="answer:1")

    result = reconcile(characteristic, GRID, [card, answer], NOW)

    (fact,) = result.facts
    assert fact.value is True
    assert fact.main.source is SourceKind.HOTELIER
    assert result.conflict is not None


def test_agreeing_sources_raise_confidence_without_conflict() -> None:
    characteristic = _characteristic(
        key="blackout", level=Level.HOTEL, authority=Authority.HOTELIER
    )
    answer = _obs(Scope.everywhere(), True, 0.8, SourceKind.HOTELIER, ref="answer:1")
    guest = _obs(Scope.everywhere(), True, 0.8, SourceKind.GUEST, ref="trip:1")

    result = reconcile(characteristic, GRID, [answer, guest], NOW)

    assert result.conflict is None
    assert result.facts[0].confidence > 0.85


def test_route_minutes_disagreement_is_a_conflict() -> None:
    characteristic = _characteristic(
        key="beach_walk", level=Level.HOTEL, value_type=ValueType.RECORD
    )
    route = _obs(Scope.everywhere(), {"minutes": 9, "back_minutes": 12}, 0.9)
    card = _obs(Scope.everywhere(), {"minutes": 2}, 0.9, SourceKind.DEMO_CARD, ref="card:1")

    result = reconcile(characteristic, GRID, [route, card], NOW)

    assert result.facts[0].value["minutes"] == 9
    assert result.conflict is not None


def test_freshest_observation_wins_for_opening_hours() -> None:
    characteristic = _characteristic(
        key="pharmacy_24_7", level=Level.HOTEL, authority=Authority.FRESHEST
    )
    old = _obs(Scope.everywhere(), True, 0.9, SourceKind.OPEN_DATA, at=NOW - timedelta(days=60))
    new = _obs(Scope.everywhere(), False, 0.9, SourceKind.HOTELIER, ref="answer:2")

    result = reconcile(characteristic, GRID, [old, new], NOW)

    assert result.facts[0].value is False


def test_old_facts_fade_toward_unsure() -> None:
    old = _obs(Scope.everywhere(), True, 0.9, at=NOW - timedelta(days=355))

    result = reconcile(_characteristic(), GRID, [old], NOW)

    assert 0.5 < result.facts[0].confidence < 0.65
