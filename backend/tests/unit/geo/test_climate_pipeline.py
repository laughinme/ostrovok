"""Calendar aggregation, units and missing SST must stay honest."""

import json
from datetime import date, timedelta
from pathlib import Path

import pytest

from app.infra.geo.climate import ClimateCatalog
from pipeline.climate import DAILY, monthly_normals, water_normals


def _times(start: int, end: int, *, hourly: bool = False) -> list[str]:
    first, stop = date(start, 1, 1), date(end + 1, 1, 1)
    days = [(first + timedelta(days=i)).isoformat() for i in range((stop - first).days)]
    return [f"{d}T{h:02d}:00" for d in days for h in range(24)] if hourly else days


def test_climate_calendar_and_units() -> None:
    times = _times(2016, 2025)
    weather = {"time": times, **{key: [10.0] * len(times) for key in DAILY.values()}}
    weather["sunshine_duration"] = [7200] * len(times)
    weather["daylight_duration"] = [36000] * len(times)
    weather["rain_sum"] = [1 if int(d[-2:]) <= 4 else 0.9 for d in times]
    normals = monthly_normals(weather, None)
    assert len(times) == 3653
    assert len(normals) == 12
    for metrics in normals.values():
        assert metrics == {
            "air_max_c": 10,
            "air_min_c": 10,
            "water_c": None,
            "sun_hours": 2,
            "daylight_h": 10,
            "rain_days": 4,
        }
    weather["temperature_2m_max"][0] = None
    with pytest.raises(ValueError, match="Incomplete"):
        monthly_normals(weather, None)


def test_water_uses_complete_months_with_equal_year_weight() -> None:
    times = _times(2023, 2025, hourly=True)
    values = [10.0 if t[:4] == "2023" else 20.0 for t in times]
    # The incomplete January 2023 must not contribute a biased partial-month mean.
    values[0] = None
    normals, years = water_normals({"time": times, "sea_surface_temperature": values})
    assert normals["1"] == 20
    assert years["1"] == 2
    assert normals["2"] == 16.67  # Leap year has equal weight, not extra hourly weight.
    assert years["2"] == 3
    with pytest.raises(ValueError, match="every requested"):
        water_normals({"time": times[1:], "sea_surface_temperature": values[1:]})
    with pytest.raises(ValueError, match="every season"):
        water_normals({"time": times, "sea_surface_temperature": [None] * len(times)})


def test_published_climate_matches_consumer() -> None:
    path = Path(__file__).resolve().parents[3] / "data/region/climate.json"
    catalog = ClimateCatalog.from_file(path)
    raw = json.loads(path.read_text())
    assert len(catalog.stations) == 4
    assert raw["period"] == "2016-2025"
    assert "CC BY 4.0" in raw["licence"]
    for station, record in zip(catalog.stations, raw["stations"], strict=True):
        assert len(station.normals) == 12
        assert record["weather_years"] == 10
        for normal in station.normals:
            assert set(normal.values) == {*DAILY, "water_c"}
            assert normal.values["air_max_c"] >= normal.values["air_min_c"]
            assert 0 <= normal.values["sun_hours"] <= normal.values["daylight_h"] <= 24
        if station.ref == "krasnaya_polyana":
            assert all(n.values["water_c"] is None for n in station.normals)
        else:
            assert 2 <= record["years"] <= 3
            november = next(n for n in station.normals if n.month == 11)
            assert 16 <= november.values["water_c"] <= 18
