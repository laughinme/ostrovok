from dataclasses import replace
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.domain.knowledge.characteristic import Checkable
from app.domain.knowledge.fact import Fact
from app.domain.knowledge.scope import Facade, Scope
from app.domain.knowledge.sources import SourceKind
from app.domain.search.intent import Chip, Importance
from app.domain.search.moods import Mood, MoodCount, count_moods
from app.domain.search.score import SearchHotel, TripWindow, Variant

HOTEL = SearchHotel(
    uuid4(),
    "Отель",
    "Сочи",
    "center",
    (39.7, 43.5),
    3,
    (Facade.N, Facade.S),
    None,
    2,
    (
        Variant(Scope(facades=frozenset({Facade.N}), floor_from=1, floor_to=3)),
        Variant(Scope(facades=frozenset({Facade.S}), floor_from=1, floor_to=3)),
    ),
)
SEA = Chip("sea", "Море", Importance.MUST, Checkable.COMPUTE, "sea_view")
QUIET = Chip("quiet", "Тишина", Importance.MUST, Checkable.COMPUTE, "day_noise")
MOOD = Mood("work", "Поработать у моря", "Тихо и море из окна", "для работы у моря", (SEA, QUIET))


def _fact(key: str, facade: Facade, *, confidence: float = 0.9) -> Fact:
    return Fact(
        hotel_id=HOTEL.id,
        characteristic=key,
        scope=Scope(facades=frozenset({facade})),
        value=True,
        confidence=confidence,
        statement="",
        scope_text="",
        source=SourceKind.COMPUTED,
        source_label="",
        method="test",
        observed_at=datetime(2026, 10, 28, tzinfo=UTC),
        valid_until=None,
    )


def test_mood_needs_all_chips_on_the_same_side() -> None:
    facts = {
        HOTEL.id: {
            "sea_view": [_fact("sea_view", Facade.S)],
            "day_noise": [_fact("day_noise", Facade.N)],
        }
    }
    assert count_moods([MOOD], [HOTEL], facts, TripWindow(None))[0].count == 0
    facts[HOTEL.id]["day_noise"].append(_fact("day_noise", Facade.S))
    assert count_moods([MOOD], [HOTEL], facts, TripWindow(None))[0].count == 1


def test_unknown_and_low_probability_do_not_count() -> None:
    mood = replace(MOOD, chips=(SEA,))
    assert count_moods([mood], [HOTEL], {}, TripWindow(None))[0].count == 0
    facts = {HOTEL.id: {"sea_view": [_fact("sea_view", Facade.S, confidence=0.6)]}}
    assert count_moods([mood], [HOTEL], facts, TripWindow(None))[0].count == 0


def test_seasonal_mood_counts_a_hotel_once_in_the_selected_month() -> None:
    mood = replace(MOOD, chips=(SEA,))
    seasonal = replace(_fact("sea_view", Facade.S), scope=Scope(months=frozenset({11})))
    facts = {HOTEL.id: {"sea_view": [seasonal]}}
    assert count_moods([mood], [HOTEL], facts, TripWindow(frozenset({11})))[0].count == 1
    assert count_moods([mood], [HOTEL], facts, TripWindow(frozenset({7})))[0].count == 0


@pytest.mark.parametrize(
    ("n", "noun"),
    [
        (0, "отелей"),
        (1, "отель"),
        (2, "отеля"),
        (11, "отелей"),
        (21, "отель"),
        (23, "отеля"),
        (114, "отелей"),
    ],
)
def test_count_label(n: int, noun: str) -> None:
    assert MoodCount(MOOD, n).count_label == f"{n} {noun} для работы у моря"


def test_counter_uses_each_moods_criterion_even_when_chip_ids_repeat() -> None:
    moods = [
        replace(MOOD, id="sea", chips=(SEA,)),
        replace(MOOD, id="quiet", chips=(replace(QUIET, id=SEA.id),)),
    ]
    facts = {HOTEL.id: {"sea_view": [_fact("sea_view", Facade.S)]}}
    assert [r.count for r in count_moods(moods, [HOTEL], facts, TripWindow(None))] == [1, 0]
