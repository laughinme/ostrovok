"""Conservative opening-hours checks for a visit on an actual local calendar date."""

from datetime import datetime, timedelta

from app.domain.geo.hours import parse_hours


def open_for(hours: str | None, arrival: datetime, stay_minutes: int) -> bool:
    """Every minute of the visit must be known open, including overnight/day boundaries."""
    if stay_minutes < 1:
        raise ValueError("Visit duration must be positive")
    schedule = parse_hours(hours)
    return schedule.complete and all(
        schedule.is_open(arrival + timedelta(minutes=offset)) is True
        for offset in range(stay_minutes)
    )
