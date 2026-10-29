from datetime import date, datetime

import numpy as np
import pytest

from app.domain.geo.sun import (
    SOLAR_RADIUS_DEG,
    disappearance,
    horizon_at,
    sun_events,
    sun_path,
    sun_position,
    sunset_over_sea_months,
)
from app.domain.geo.types import LonLat

SOCHI = LonLat(39.7231, 43.5855)


@pytest.mark.parametrize(
    ("day", "rise", "setting", "azimuth"),
    [
        ("2026-03-20", "06:24:46", "18:33:09", 270.8112),
        ("2026-06-21", "04:39:49", "20:05:59", 304.2646),
        ("2026-09-23", "06:09:12", "18:17:06", 270.4527),
        ("2026-12-21", "07:51:01", "16:47:13", 237.6344),
    ],
)
def test_sochi_events_against_nrel_spa(day: str, rise: str, setting: str, azimuth: float) -> None:
    event = sun_events(SOCHI, date.fromisoformat(day))
    assert event.sunset.azimuth_deg == pytest.approx(azimuth, abs=1)
    for position, expected in [(event.sunrise, rise), (event.sunset, setting)]:
        reference = datetime.fromisoformat(f"{day}T{expected}+03:00")
        assert abs((position.at - reference).total_seconds()) < 120
    assert event.sunset.at.utcoffset().total_seconds() == 10800


def test_path_and_aware_time() -> None:
    path = sun_path(SOCHI, date(2026, 6, 21), step_minutes=60)
    assert len(path) == 25
    assert path[-1].at.date() == date(2026, 6, 22)
    assert max(p.elevation_deg for p in path) > 65
    with pytest.raises(ValueError, match="timezone"):
        sun_position(SOCHI, datetime(2026, 6, 21, 12))  # noqa: DTZ001


def test_north_wrap_does_not_interpolate_across_missing_fov() -> None:
    azimuths = np.array([350.0, 0.0, 10.0])
    assert horizon_at(355, azimuths, np.array([0.0, 10.0, 0.0])) == 5
    assert np.isnan(horizon_at(180, azimuths, np.zeros(3)))


def test_mountain_disappearance_and_always_blocked() -> None:
    azimuths = np.arange(200.0, 341.0)
    day = date(2026, 6, 21)
    actual = disappearance(SOCHI, day, azimuths, np.full(141, 10.0))
    assert actual is not None
    assert actual.elevation_deg + SOLAR_RADIUS_DEG == pytest.approx(10, abs=0.01)
    assert sun_events(SOCHI, day).sunset.at > actual.at
    assert disappearance(SOCHI, day, azimuths, np.full(141, 90.0)) is None


def test_seasonal_sunset_sea_fraction() -> None:
    azimuths = np.arange(200.0, 341.0)
    sea = azimuths <= 280
    fractions = sunset_over_sea_months(SOCHI, 2026, azimuths, np.zeros(141), sea)
    assert fractions[1] == 1
    assert fractions[6] == 0
    assert set(fractions) == set(range(1, 13))
    blocked = sunset_over_sea_months(SOCHI, 2026, azimuths, np.ones(141), sea)
    assert all(value == 0 for value in blocked.values())
