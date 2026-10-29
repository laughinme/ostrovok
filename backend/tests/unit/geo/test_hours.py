from datetime import UTC, datetime

import pytest

from app.domain.geo.hours import parse_hours


def at(day: int, hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 10, day, hour, minute, tzinfo=UTC)


def test_always_open() -> None:
    hours = parse_hours("24/7")
    assert hours.is_open(at(26, 3), timezone="UTC")
    assert hours.at_night
    assert hours.in_morning
    assert hours.always_open
    assert hours.confidence == 1


def test_daily_hours_and_exclusive_closing() -> None:
    hours = parse_hours("Mo-Su 08:00-23:00")
    assert hours.is_open(at(26, 8), timezone="UTC") is True
    assert hours.is_open(at(26, 7, 59), timezone="UTC") is False
    assert hours.is_open(at(26, 23), timezone="UTC") is False
    assert hours.at_night is False
    assert hours.in_morning is True
    assert hours.always_open is False


def test_weekday_rules_and_week_wrap() -> None:
    hours = parse_hours("Mo-Fr 09:00-18:00; Sa 10:00-16:00")
    assert hours.is_open(at(31, 11), timezone="UTC") is True
    assert hours.is_open(datetime(2026, 11, 1, 11, tzinfo=UTC), timezone="UTC") is False
    overnight = parse_hours("Su 21:00-04:00")
    assert overnight.is_open(at(26, 3), timezone="UTC") is True
    assert overnight.is_open(at(26, 4), timezone="UTC") is False
    assert overnight.at_night is True


@pytest.mark.parametrize(
    "value", [None, "", "по настроению", "PH off", "Mo 25:00-29:00", "24/7; PH off"]
)
def test_unsupported_hours_stay_unknown(value: str | None) -> None:
    hours = parse_hours(value)
    assert hours.is_open(at(26, 12)) is None
    assert hours.at_night is None
    assert hours.always_open is None
    assert hours.confidence < 0.5


def test_timezone_and_split_intervals() -> None:
    hours = parse_hours("Mo 09:00-12:00,13:00-18:00")
    assert hours.is_open(at(26, 6)) is True
    assert hours.is_open(at(26, 9, 30)) is False
    assert parse_hours("Mo-Su 00:00-24:00").always_open is True
    with pytest.raises(ValueError, match="timezone-aware"):
        hours.is_open(datetime(2026, 10, 26, 12))  # noqa: DTZ001
