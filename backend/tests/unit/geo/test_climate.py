import json
from datetime import date
from pathlib import Path

import pytest

from app.domain.geo.climate import MonthlyNormal, month_day_weights, trip_normals
from app.domain.geo.types import LonLat
from app.infra.geo.climate import ClimateCatalog


def test_monthly_average_is_weighted_by_days_and_checkout_exclusive() -> None:
    normals = [MonthlyNormal(10, {"water_c": 20.3}), MonthlyNormal(11, {"water_c": 16.1})]
    result = trip_normals(normals, date(2026, 10, 30), date(2026, 11, 4))
    assert result.days == 5
    assert result.month_days == {10: 2, 11: 3}
    assert result.values["water_c"] == pytest.approx((20.3 * 2 + 16.1 * 3) / 5)
    assert result.coverage["water_c"] == 1
    assert result.confidence["water_c"] == 0.9


def test_leap_year_and_year_wrap() -> None:
    assert month_day_weights(date(2024, 2, 28), date(2024, 3, 2)) == {2: 2, 3: 1}
    assert month_day_weights(date(2026, 12, 30), date(2027, 1, 3)) == {12: 2, 1: 2}
    assert month_day_weights(date(9999, 12, 30), date.max) == {12: 1}


def test_missing_water_is_not_zero_and_short_history_reduces_confidence() -> None:
    normals = [
        MonthlyNormal(10, {"air_c": 20, "water_c": None}, years=5),
        MonthlyNormal(11, {"air_c": 10, "water_c": None}, years=10),
    ]
    result = trip_normals(normals, date(2026, 10, 31), date(2026, 11, 2))
    assert result.values["air_c"] == 15
    assert result.confidence["air_c"] == pytest.approx(0.9 * 0.75)
    assert result.values["water_c"] is None
    assert result.coverage["water_c"] == 0
    partial = trip_normals(normals[:1], date(2026, 10, 31), date(2026, 11, 2))
    assert partial.values["air_c"] == 20
    assert partial.coverage["air_c"] == 0.5


def test_invalid_dates_and_duplicate_months_are_rejected() -> None:
    normal = MonthlyNormal(1, {"air_c": 10})
    with pytest.raises(ValueError, match="Checkout"):
        trip_normals([normal], date(2026, 1, 2), date(2026, 1, 2))
    with pytest.raises(ValueError, match="Duplicate"):
        trip_normals([normal, normal], date(2026, 1, 1), date(2026, 1, 2))


def test_load_climate_json_and_choose_nearest_station(tmp_path: Path) -> None:
    path = tmp_path / "climate.json"
    path.write_text(
        json.dumps(
            {
                "source": "synthetic",
                "period": "2016-2025",
                "stations": [
                    {"id": "coast", "lon": 39.7, "lat": 43.6, "months": {"11": {"air_c": 15}}},
                    {"id": "mountain", "lon": 40.3, "lat": 43.7, "months": {"11": {"air_c": 5}}},
                ],
            }
        )
    )
    catalog = ClimateCatalog.from_file(path)
    location = LonLat(40.29, 43.69)
    assert catalog.nearest(location).ref == "mountain"
    result = catalog.estimate(location, date(2026, 11, 1), date(2026, 11, 8))
    assert result.values["air_c"] == 5
    assert catalog.source == "synthetic"
