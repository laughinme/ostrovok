from calendar import monthrange
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date
from math import isfinite

MONTHS_PER_YEAR = 12
REFERENCE_YEARS = 10


@dataclass(frozen=True, slots=True)
class MonthlyNormal:
    month: int
    values: Mapping[str, float | None]
    years: int = REFERENCE_YEARS

    def __post_init__(self) -> None:
        if not 1 <= self.month <= MONTHS_PER_YEAR or self.years < 1:
            raise ValueError("Invalid month or number of climate years")
        if any(value is not None and not isfinite(value) for value in self.values.values()):
            raise ValueError("Climate values must be finite or unknown")


@dataclass(frozen=True, slots=True)
class ClimateEstimate:
    check_in: date
    check_out: date
    days: int
    values: Mapping[str, float | None]
    coverage: Mapping[str, float]
    confidence: Mapping[str, float]
    month_days: Mapping[int, int]


def month_day_weights(check_in: date, check_out: date) -> dict[int, int]:
    if check_out <= check_in:
        raise ValueError("Checkout must be after check-in")
    counts: dict[int, int] = {}
    current = check_in
    while current < check_out:
        available = monthrange(current.year, current.month)[1] - current.day + 1
        days = min(available, (check_out - current).days)
        counts[current.month] = counts.get(current.month, 0) + days
        if days == (check_out - current).days:
            break
        current = date(current.year + current.month // MONTHS_PER_YEAR, current.month % 12 + 1, 1)
    return counts


def trip_normals(
    normals: Sequence[MonthlyNormal], check_in: date, check_out: date
) -> ClimateEstimate:
    weights = month_day_weights(check_in, check_out)
    by_month = {normal.month: normal for normal in normals}
    if len(by_month) != len(normals):
        raise ValueError("Duplicate climate month")
    metrics = sorted({metric for normal in normals for metric in normal.values})
    days = (check_out - check_in).days
    values: dict[str, float | None] = {}
    coverage: dict[str, float] = {}
    confidence: dict[str, float] = {}
    for metric in metrics:
        weighted, known, quality = 0.0, 0, 0.0
        for month, weight in weights.items():
            normal = by_month.get(month)
            value = normal.values.get(metric) if normal else None
            if normal is not None and value is not None:
                weighted += value * weight
                known += weight
                quality += weight * min(1.0, normal.years / REFERENCE_YEARS)
        values[metric] = weighted / known if known else None
        coverage[metric] = known / days
        confidence[metric] = 0.9 * quality / days
    return ClimateEstimate(check_in, check_out, days, values, coverage, confidence, weights)
