from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Literal, Protocol

import numpy as np

from app.domain.geo.projection import FloatArray
from app.domain.geo.scene import Horizon, Obstacle
from app.domain.geo.sun import (
    MOSCOW,
    SOLAR_RADIUS_DEG,
    SunPosition,
    horizon_at,
    sun_events,
    sun_position,
)
from app.domain.geo.types import LonLat


class AzimuthSector(Protocol):
    @property
    def azimuths_deg(self) -> FloatArray: ...


@dataclass(frozen=True, slots=True)
class SolarIntersection:
    position: SunPosition
    behind: str


def event_visible(
    position: SunPosition, scene: AzimuthSector, horizon: Horizon, *, over_sea: bool
) -> bool:
    angle = horizon_at(position.azimuth_deg, scene.azimuths_deg, horizon.angle_deg)
    ray = int(np.argmin(np.abs((scene.azimuths_deg - position.azimuth_deg + 180) % 360 - 180)))
    sea = horizon.sea_visible[ray] and horizon.kind[ray] == Obstacle.SEA
    return bool(np.isfinite(angle) and angle < 0.5 and (sea or not over_sea))


RISE_WINDOW_MIN = 90


def rises_into_view(
    location: LonLat, sunrise: SunPosition, scene: AzimuthSector, horizon: Horizon
) -> bool:
    return any(
        _above(location, sunrise.at + timedelta(minutes=m), scene, horizon)
        for m in range(0, RISE_WINDOW_MIN + 1, 10)
    )


def solar_intersection(
    location: LonLat,
    day: date,
    scene: AzimuthSector,
    horizon: Horizon,
    *,
    event: Literal["sunset", "sunrise"],
    eye_m: float = 0,
) -> SolarIntersection | None:
    events = sun_events(location, day, eye_elevation_m=max(0, eye_m))
    noon = datetime.combine(day, time(12), MOSCOW)
    start, end = (noon, events.sunset.at) if event == "sunset" else (events.sunrise.at, noon)
    count = int((end - start).total_seconds() // 300)
    times = [start + timedelta(minutes=i * 5) for i in range(count + 1)] + [end]
    visible = [_above(location, at, scene, horizon) for at in times]
    indices = [i for i, yes in enumerate(visible) if yes]
    if not indices:
        return None
    index = indices[-1] if event == "sunset" else indices[0]
    if (event == "sunset" and index == len(times) - 1) or (event == "sunrise" and index == 0):
        return SolarIntersection(sun_position(location, times[index]), "море/открытый горизонт")
    low, high = (
        (times[index], times[index + 1]) if event == "sunset" else (times[index - 1], times[index])
    )
    while (high - low).total_seconds() > 1:
        middle = low + (high - low) / 2
        if _above(location, middle, scene, horizon) == (event == "sunset"):
            low = middle
        else:
            high = middle
    position = sun_position(location, high)
    angle = horizon_at(position.azimuth_deg, scene.azimuths_deg, horizon.angle_deg)
    ray = int(np.argmin(np.abs((scene.azimuths_deg - position.azimuth_deg + 180) % 360 - 180)))
    labels = {Obstacle.BUILDING: "здание", Obstacle.TERRAIN: "гора", Obstacle.SEA: "море"}
    behind = labels.get(Obstacle(int(horizon.kind[ray])), "неизвестно")
    return SolarIntersection(position, behind if np.isfinite(angle) else "граница поля зрения")


def _above(location: LonLat, at: datetime, scene: AzimuthSector, horizon: Horizon) -> bool:
    position = sun_position(location, at)
    angle = horizon_at(position.azimuth_deg, scene.azimuths_deg, horizon.angle_deg)
    return bool(position.elevation_deg + SOLAR_RADIUS_DEG > angle)
