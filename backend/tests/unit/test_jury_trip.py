from datetime import UTC, date, datetime

import pytest

from app.domain.search.trip import parse_trip, today_in_sochi, trip_hints

TODAY = date(2026, 10, 29)


@pytest.mark.parametrize(
    "text", ["31 февраля", "29 февраля 2027", "32 января", "31 апреля", "15–12 ноября"]
)
def test_invalid_dates_become_a_hint(text: str) -> None:
    trip = parse_trip(text, today=TODAY)
    assert trip.check_in is None
    assert trip.check_out is None
    assert "даты" in trip_hints(text, trip)[0]


@pytest.mark.parametrize(
    ("text", "start", "end"),
    [
        ("на выходных", date(2026, 10, 31), date(2026, 11, 2)),
        ("в следующие выходные", date(2026, 11, 7), date(2026, 11, 9)),
        ("завтра на две ночи", date(2026, 10, 30), date(2026, 11, 1)),
        ("2026-11-12 — 2026-11-15", date(2026, 11, 12), date(2026, 11, 15)),
        ("12.11.2026–15.11.2026", date(2026, 11, 12), date(2026, 11, 15)),
        ("12 ноября 2027", date(2027, 11, 12), None),
        ("30 декабря по 3 января", date(2026, 12, 30), date(2027, 1, 3)),
    ],
)
def test_dates(text: str, start: date, end: date | None) -> None:
    trip = parse_trip(text, today=TODAY)
    assert (trip.check_in, trip.check_out) == (start, end)


def test_months_have_no_invented_days() -> None:
    assert parse_trip("в следующем месяце", today=TODAY).month == 11
    assert parse_trip("в следующем месяце", today=date(2026, 12, 29)).month == 1
    may = parse_trip("на майские", today=TODAY)
    assert may.month == 5
    assert may.check_in is None
    assert trip_hints("на майские", may)


@pytest.mark.parametrize(
    ("text", "adults", "children"),
    [
        ("0 взрослых и 0 детей", None, 0),
        ("100 взрослых и 25 детей", None, None),
        ("вдвоём без детей", 2, 0),
        ("one adult and one child", 1, 1),
        ("two adults and 0 children", 2, 0),
        ("нас трое", 3, None),
        ("семья с двумя детьми", None, 2),
    ],
)
def test_guests(text: str, adults: int | None, children: int | None) -> None:
    trip = parse_trip(text, today=TODAY)
    assert (trip.adults, trip.children) == (adults, children)


def test_small_budget_needs_currency_and_huge_budget_is_not_invented() -> None:
    assert parse_trip("за 500 рублей", today=TODAY).budget_per_night == 500
    assert parse_trip("до 10 минут до моря", today=TODAY).budget_per_night is None
    assert parse_trip("до 999999999999999999999 тысяч", today=TODAY).budget_per_night is None


def test_relative_dates_follow_sochi_not_utc_midnight() -> None:
    assert today_in_sochi(datetime(2026, 10, 28, 22, tzinfo=UTC)) == TODAY
