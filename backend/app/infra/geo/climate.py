"""File boundary for monthly normals; domain calculations never read JSON."""

import json
from dataclasses import dataclass
from datetime import date
from math import isfinite
from pathlib import Path
from typing import Self, cast

import numpy as np

from app.domain.geo.climate import ClimateEstimate, MonthlyNormal, trip_normals
from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import LonLat


@dataclass(frozen=True, slots=True)
class ClimateStation:
    ref: str
    location: LonLat
    normals: tuple[MonthlyNormal, ...]


@dataclass(frozen=True, slots=True)
class ClimateCatalog:
    stations: tuple[ClimateStation, ...]
    source: str
    period: str

    @classmethod
    def from_file(cls, path: Path) -> Self:
        """Load stations[{id,lon,lat,years,months:{'1':{metric:value|null},...}}]."""
        raw = _mapping(json.loads(path.read_text(encoding="utf-8")))
        rows = raw.get("stations")
        if not isinstance(rows, list) or not rows:
            raise ValueError("Climate catalog needs a nonempty stations list")
        stations = tuple(_station(row) for row in rows)
        if len({station.ref for station in stations}) != len(stations):
            raise ValueError("Duplicate climate station")
        return cls(stations, str(raw.get("source", "")), str(raw.get("period", "")))

    def nearest(self, location: LonLat) -> ClimateStation:
        """Choose the closest sample point, not an interpolated weather forecast."""
        if not self.stations:
            raise ValueError("Empty climate catalog")
        points = np.array(
            [[station.location.lon, station.location.lat] for station in self.stations]
        )
        distances = np.linalg.norm(LocalProjection(location).forward(points), axis=1)
        return self.stations[int(np.argmin(distances))]

    def estimate(self, location: LonLat, check_in: date, check_out: date) -> ClimateEstimate:
        return trip_normals(self.nearest(location).normals, check_in, check_out)


def _mapping(value: object) -> dict[str, object]:
    if not isinstance(value, dict) or not all(isinstance(key, str) for key in value):
        raise ValueError("Expected a JSON object with string keys")
    return cast(dict[str, object], value)


def _number(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value):
        raise ValueError("Expected a finite climate number")
    return float(value)


def _station(value: object) -> ClimateStation:
    raw = _mapping(value)
    ref = raw.get("id")
    if not isinstance(ref, str) or not ref:
        raise ValueError("Climate station needs an id")
    location = LonLat(_number(raw.get("lon")), _number(raw.get("lat")))
    LocalProjection(location)
    years = _number(raw.get("years", 10))
    if not years.is_integer():
        raise ValueError("Climate years must be an integer")
    normals = []
    for month, metrics in _mapping(raw.get("months")).items():
        values = {
            key: None if item is None else _number(item) for key, item in _mapping(metrics).items()
        }
        normals.append(MonthlyNormal(int(month), values, int(years)))
    if not normals or len({normal.month for normal in normals}) != len(normals):
        raise ValueError("Expected nonempty, unique climate months")
    return ClimateStation(ref, location, tuple(normals))
