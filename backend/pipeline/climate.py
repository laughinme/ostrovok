"""Open-Meteo ERA5 weather normals and observed Marine SST coverage."""

import calendar
import json
from collections import defaultdict
from datetime import date, timedelta
from math import isfinite
from statistics import mean
from typing import Any
from urllib.parse import urlencode

from pipeline.storage import REGION, download, write_json

START_YEAR, END_YEAR = 2016, 2025
WATER_START_YEAR = 2023
STATIONS = {
    "center": (39.7231, 43.5855),
    "adler": (39.9200, 43.4300),
    "sirius": (39.9600, 43.4000),
    "krasnaya_polyana": (40.2020, 43.6800),
}
DAILY = {
    "air_max_c": "temperature_2m_max",
    "air_min_c": "temperature_2m_min",
    "sun_hours": "sunshine_duration",
    "daylight_h": "daylight_duration",
    "rain_days": "rain_sum",
}


def request_url(kind: str, lon: float, lat: float) -> str:
    marine = kind == "marine"
    host = "marine-api" if marine else "archive-api"
    params = {
        "longitude": lon,
        "latitude": lat,
        "start_date": f"{WATER_START_YEAR if marine else START_YEAR}-01-01",
        "end_date": f"{END_YEAR}-12-31",
        "timezone": "Europe/Moscow",
        "models": "best_match" if marine else "era5",
        "cell_selection": "sea" if marine else "land",
        "hourly" if marine else "daily": (
            "sea_surface_temperature" if marine else ",".join(DAILY.values())
        ),
    }
    return f"https://{host}.open-meteo.com/v1/{kind}?{urlencode(params)}"


def _dates(hourly: bool) -> list[str]:
    start = date(WATER_START_YEAR if hourly else START_YEAR, 1, 1)
    end = date(END_YEAR + 1, 1, 1)
    days = [(start + timedelta(days=i)).isoformat() for i in range((end - start).days)]
    return [f"{day}T{hour:02d}:00" for day in days for hour in range(24)] if hourly else days


def _groups(raw: dict[str, Any], *, hourly: bool) -> dict[tuple[int, int], list[int]]:
    times = raw.get("time")
    if times != _dates(hourly):
        raise ValueError("Climate archive must contain every requested day/hour, in order")
    groups: dict[tuple[int, int], list[int]] = defaultdict(list)
    for i, stamp in enumerate(times):
        groups[int(stamp[:4]), int(stamp[5:7])].append(i)
    return groups


def _finite(value: Any) -> bool:
    return not isinstance(value, bool) and isinstance(value, (int, float)) and isfinite(value)


def _values(raw: dict[str, Any], key: str) -> list[float]:
    values = raw[key]
    if len(values) != len(raw["time"]) or any(not _finite(v) for v in values):
        raise ValueError(f"Incomplete climate metric: {key}")
    return [float(v) for v in values]


def monthly_normals(weather: dict[str, Any], marine: dict[str, Any] | None) -> dict[str, Any]:
    """Equal-year monthly means: Celsius, hours/day, days with >=1 mm rain/month."""
    groups = _groups(weather, hourly=False)
    result: dict[str, Any] = {str(month): {"water_c": None} for month in range(1, 13)}
    for metric, key in DAILY.items():
        values = _values(weather, key)
        by_month: dict[int, list[float]] = defaultdict(list)
        for (_, month), indices in groups.items():
            if metric == "rain_days":
                value = float(sum(values[i] >= 1 for i in indices))
            else:
                value = mean(values[i] for i in indices)
                if metric in {"sun_hours", "daylight_h"}:
                    value /= 3600
            by_month[month].append(value)
        for month, years in by_month.items():
            result[str(month)][metric] = round(mean(years), 2)
    if marine is not None:
        water, _ = water_normals(marine)
        for month, value in water.items():
            result[month]["water_c"] = value
    return result


def water_normals(marine: dict[str, Any]) -> tuple[dict[str, float], dict[str, int]]:
    """Use only complete calendar months; never fill missing SST with invented data."""
    groups = _groups(marine, hourly=True)
    values = marine["sea_surface_temperature"]
    if len(values) != len(marine["time"]):
        raise ValueError("Water archive length mismatch")
    months: dict[str, list[float]] = defaultdict(list)
    for (_, month), indices in groups.items():
        samples = [values[i] for i in indices]
        if all(_finite(v) for v in samples):
            months[str(month)].append(mean(samples))
    if set(months) != {str(m) for m in range(1, 13)}:
        raise ValueError("No complete water month for every season")
    return (
        {m: round(mean(v), 2) for m, v in months.items()},
        {m: len(v) for m, v in months.items()},
    )


def _station(ref: str, lon: float, lat: float) -> dict[str, Any]:
    weather_url = request_url("archive", lon, lat)
    weather = json.loads(download(weather_url).read_text())
    marine_url = request_url("marine", lon, lat) if ref != "krasnaya_polyana" else None
    marine = json.loads(download(marine_url).read_text()) if marine_url else None
    return {
        "id": ref,
        "lon": lon,
        "lat": lat,
        "years": min(water_normals(marine["hourly"])[1].values()) if marine else 10,
        "weather_years": 10,
        "water_years_by_month": water_normals(marine["hourly"])[1] if marine else None,
        "months": monthly_normals(weather["daily"], marine["hourly"] if marine else None),
        "requests": {"weather": weather_url, "water": marine_url},
        "weather_grid": {k: weather[k] for k in ("latitude", "longitude", "elevation")},
        "water_grid": ({k: marine[k] for k in ("latitude", "longitude")} if marine else None),
    }


def run() -> None:
    stations = [_station(ref, lon, lat) for ref, (lon, lat) in STATIONS.items()]
    write_json(
        REGION / "climate.json",
        {
            "source": "Open-Meteo Archive (ERA5) + Marine (best_match SST)",
            "period": f"{START_YEAR}-{END_YEAR}",
            "water_period": f"{WATER_START_YEAR}-{END_YEAR}; only complete calendar months",
            "years_note": "Station years is the conservative minimum across metrics and months",
            "licence": "CC BY 4.0, Open-Meteo and its model providers (ECMWF ERA5)",
            "aggregation": "Equal weight per year; daily extrema, sunshine/daylight hours per day; "
            "rain days >=1 mm liquid rain per month; hourly sea surface temperature",
            "calendar_days": sum(
                366 if calendar.isleap(y) else 365 for y in range(START_YEAR, END_YEAR + 1)
            ),
            "stations": stations,
        },
    )
