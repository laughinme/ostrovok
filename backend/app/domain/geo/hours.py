import re
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

DAY_HOURS = 24
HOUR_MINUTES = 60
DAY_RANGE_PARTS = 2
DAY_MINUTES = DAY_HOURS * HOUR_MINUTES
WEEK_MINUTES = 7 * DAY_MINUTES
WEEKDAYS = ("Mo", "Tu", "We", "Th", "Fr", "Sa", "Su")
RULE = re.compile(r"(?:(?P<days>[A-Za-z,-]+)\s+)?(?P<times>[\d:,\s-]+|off|closed)")


@dataclass(frozen=True, slots=True)
class WeeklyInterval:
    weekday: int
    start_minute: int
    end_minute: int

    def overlaps(self, start: int, end: int) -> bool:
        left = self.weekday * DAY_MINUTES + self.start_minute
        right = self.weekday * DAY_MINUTES + self.end_minute
        return any(
            left < end + shift and right > start + shift
            for shift in (-WEEK_MINUTES, 0, WEEK_MINUTES)
        )


@dataclass(frozen=True, slots=True)
class OpeningHours:
    intervals: tuple[WeeklyInterval, ...]
    complete: bool
    confidence: float

    def is_open(self, moment: datetime, *, timezone: str = "Europe/Moscow") -> bool | None:
        if moment.utcoffset() is None:
            raise ValueError("Opening hours require a timezone-aware instant")
        local = moment.astimezone(ZoneInfo(timezone))
        minute = local.weekday() * DAY_MINUTES + local.hour * 60 + local.minute
        if any(interval.overlaps(minute, minute + 1) for interval in self.intervals):
            return True
        return False if self.complete else None

    def in_window(self, start_minute: int, end_minute: int) -> bool | None:
        if not 0 <= start_minute < end_minute <= DAY_MINUTES:
            raise ValueError("Invalid daily time window")
        for day in range(7):
            start, end = day * DAY_MINUTES + start_minute, day * DAY_MINUTES + end_minute
            if any(interval.overlaps(start, end) for interval in self.intervals):
                return True
        return False if self.complete else None

    @property
    def at_night(self) -> bool | None:
        windows = (self.in_window(23 * 60, DAY_MINUTES), self.in_window(0, 6 * 60))
        return True if True in windows else (False if self.complete else None)

    @property
    def in_morning(self) -> bool | None:
        return self.in_window(6 * 60, 11 * 60)

    @property
    def always_open(self) -> bool | None:
        if not self.complete:
            return None
        ranges = sorted(
            (i.weekday * DAY_MINUTES + i.start_minute, i.weekday * DAY_MINUTES + i.end_minute)
            for i in self.intervals
        )
        ranges += [(left - WEEK_MINUTES, right - WEEK_MINUTES) for left, right in ranges]
        covered = 0
        for left, right in sorted(ranges):
            if right <= covered:
                continue
            if left > covered:
                return False
            covered = right
        return covered >= WEEK_MINUTES


def _days(value: str | None) -> tuple[int, ...]:
    result: set[int] = set()
    for part in (value or "Mo-Su").split(","):
        bounds = part.split("-")
        if len(bounds) > DAY_RANGE_PARTS:
            raise ValueError("Invalid day range")
        start, end = WEEKDAYS.index(bounds[0]), WEEKDAYS.index(bounds[-1])
        result.update((start + offset) % 7 for offset in range((end - start) % 7 + 1))
    return tuple(sorted(result))


def _minute(value: str, *, end: bool = False) -> int:
    if not re.fullmatch(r"\d{2}:\d{2}", value):
        raise ValueError("Invalid clock time")
    hour, minute = map(int, value.split(":"))
    if hour == DAY_HOURS and minute == 0 and end:
        return DAY_MINUTES
    if not 0 <= hour < DAY_HOURS or not 0 <= minute < HOUR_MINUTES:
        raise ValueError("Invalid clock time")
    return hour * 60 + minute


def _intervals(rule: str) -> tuple[WeeklyInterval, ...]:
    match = RULE.fullmatch(rule.strip())
    if match is None:
        raise ValueError("Unsupported opening_hours rule")
    days = _days(match["days"])
    if match["times"] in {"off", "closed"}:
        return ()
    result: list[WeeklyInterval] = []
    for times in match["times"].split(","):
        start, end = times.strip().split("-")
        left, right = _minute(start), _minute(end, end=True)
        if right <= left:
            right += DAY_MINUTES
        result.extend(WeeklyInterval(day, left, right) for day in days)
    return tuple(result)


def parse_hours(value: str | None) -> OpeningHours:
    if not value or not value.strip():
        return OpeningHours((), False, 0.0)
    if value.strip() == "24/7":
        return OpeningHours(
            tuple(WeeklyInterval(day, 0, DAY_MINUTES) for day in range(7)), True, 1.0
        )
    intervals: list[WeeklyInterval] = []
    covered_days: set[int] = set()
    try:
        for rule in value.split(";"):
            match = RULE.fullmatch(rule.strip())
            if match is None:
                raise ValueError("Unsupported rule")
            days = set(_days(match["days"]))
            if covered_days & days:
                raise ValueError("Overriding rules are unsupported")
            covered_days.update(days)
            intervals.extend(_intervals(rule))
    except ValueError:
        return OpeningHours((), False, 0.2)
    return OpeningHours(tuple(intervals), True, 1.0)
