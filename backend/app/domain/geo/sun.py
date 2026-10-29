from calendar import monthrange
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import numpy as np
from astral import Observer
from astral.sun import azimuth, elevation, sunrise, sunset
from numpy.typing import NDArray

from app.domain.geo.projection import FloatArray
from app.domain.geo.types import LonLat

MOSCOW = ZoneInfo("Europe/Moscow")
SOLAR_RADIUS_DEG = 0.2667
_SEA_HORIZON_LIMIT_DEG = 0.5


@dataclass(frozen=True, slots=True)
class SunPosition:
    at: datetime
    azimuth_deg: float
    elevation_deg: float


@dataclass(frozen=True, slots=True)
class SunEvents:
    sunrise: SunPosition
    sunset: SunPosition


def sun_position(location: LonLat, at: datetime) -> SunPosition:
    if at.tzinfo is None or at.utcoffset() is None:
        raise ValueError("Solar position requires a timezone-aware datetime")
    observer = Observer(latitude=location.lat, longitude=location.lon)
    return SunPosition(
        at.astimezone(MOSCOW), float(azimuth(observer, at)), float(elevation(observer, at))
    )


def sun_events(location: LonLat, day: date, *, eye_elevation_m: float = 0) -> SunEvents:
    observer = Observer(latitude=location.lat, longitude=location.lon, elevation=eye_elevation_m)
    return SunEvents(
        sun_position(location, sunrise(observer, date=day, tzinfo=MOSCOW)),
        sun_position(location, sunset(observer, date=day, tzinfo=MOSCOW)),
    )


def sun_path(location: LonLat, day: date, *, step_minutes: int = 10) -> tuple[SunPosition, ...]:
    if step_minutes < 1:
        raise ValueError("Sun path step must be positive")
    start = datetime.combine(day, time.min, MOSCOW)
    samples = [
        sun_position(location, start + timedelta(minutes=m)) for m in range(0, 1440, step_minutes)
    ]
    return (*samples, sun_position(location, start + timedelta(days=1)))


def horizon_at(azimuth_deg: float, azimuths: FloatArray, angles: FloatArray) -> float:
    if azimuths.ndim != 1 or len(azimuths) == 0 or angles.shape != azimuths.shape:
        raise ValueError("Expected equal nonempty 1D horizon arrays")
    unwrapped = np.degrees(np.unwrap(np.radians(azimuths)))
    if len(unwrapped) > 1 and np.any(np.diff(unwrapped) <= 0):
        raise ValueError("Horizon azimuths must follow the increasing sector order")
    middle = (unwrapped[0] + unwrapped[-1]) / 2
    target = middle + (azimuth_deg - middle + 180) % 360 - 180
    return float(np.interp(target, unwrapped, angles, left=np.nan, right=np.nan))


def disappearance(
    location: LonLat,
    day: date,
    azimuths: FloatArray,
    angles: FloatArray,
    *,
    eye_elevation_m: float = 0,
) -> SunPosition | None:
    end = sun_events(location, day, eye_elevation_m=eye_elevation_m).sunset.at
    start = datetime.combine(day, time(12), MOSCOW)
    if end <= start:
        return None
    count = int((end - start).total_seconds() // 60) + 1
    times = [start + timedelta(minutes=i) for i in range(count)] + [end]
    visible = [_visible(sun_position(location, at), azimuths, angles) for at in times]
    indices = [i for i, yes in enumerate(visible) if yes]
    if not indices:
        return None
    last = indices[-1]
    if last == len(times) - 1:
        return sun_position(location, end)
    low, high = times[last], times[last + 1]
    while (high - low).total_seconds() > 1:
        middle = low + (high - low) / 2
        if _visible(sun_position(location, middle), azimuths, angles):
            low = middle
        else:
            high = middle
    return sun_position(location, high)


def _visible(position: SunPosition, azimuths: FloatArray, angles: FloatArray) -> bool:
    obstruction = horizon_at(position.azimuth_deg, azimuths, angles)
    return bool(position.elevation_deg + SOLAR_RADIUS_DEG > obstruction)


def sunset_over_sea_months(
    location: LonLat,
    year: int,
    azimuths: FloatArray,
    angles: FloatArray,
    sea_visible: NDArray[np.bool_],
    *,
    eye_elevation_m: float = 0,
) -> dict[int, float]:
    if sea_visible.shape != azimuths.shape:
        raise ValueError("Sea visibility must match horizon azimuths")
    result = {}
    for month in range(1, 13):
        days = monthrange(year, month)[1]
        yes = 0
        for day in range(1, days + 1):
            event = sun_events(
                location, date(year, month, day), eye_elevation_m=eye_elevation_m
            ).sunset
            angle = horizon_at(event.azimuth_deg, azimuths, angles)
            delta = np.abs((azimuths - event.azimuth_deg + 180) % 360 - 180)
            yes += bool(angle < _SEA_HORIZON_LIMIT_DEG and sea_visible[int(np.argmin(delta))])
        result[month] = yes / days
    return result
