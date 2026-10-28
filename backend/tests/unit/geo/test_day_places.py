from datetime import datetime

import pytest
from shapely import Point

from app.domain.catalog import MapFeature
from app.domain.geo.sun import MOSCOW
from app.domain.geo.visits import open_for
from app.service.geo.day_places import meal_candidates, pharmacy_candidates


def feature(ref, amenity, hours):
    return MapFeature(
        ref, "poi", ref, {"amenity": amenity, "opening_hours": hours}, Point(39.7, 43.6)
    )


def test_actual_date_and_full_visit_are_checked() -> None:
    monday = datetime(2026, 11, 9, 8, 30, tzinfo=MOSCOW)
    assert open_for("Mo 08:00-09:00", monday, 30)
    assert not open_for("Mo 08:00-09:00", monday, 31)
    assert not open_for("Tu-Su 08:00-23:00", monday, 30)
    assert not open_for(None, monday, 30)
    assert not open_for("Mo-Su 08:00-23:00; PH off", monday, 30)
    with pytest.raises(ValueError, match="positive"):
        open_for("24/7", monday, 0)


def test_overnight_visit_and_late_dinner() -> None:
    friday = datetime(2026, 11, 13, 23, 30, tzinfo=MOSCOW)
    assert open_for("Fr 18:00-02:00", friday, 90)
    foods = [
        feature("way/1", "restaurant", "Mo-Su 08:00-22:00"),
        feature("way/2", "restaurant", "Mo-Su 18:00-02:00"),
        feature("way/3", "cafe", "24/7"),
    ]
    dinner = friday.replace(hour=19, minute=30)
    assert [f.osm_id for f in meal_candidates(foods, dinner, 60, late=True)] == ["way/2"]


def test_pharmacy_is_truly_full_week() -> None:
    pharmacies = [
        feature("way/1", "pharmacy", "24/7"),
        feature("way/2", "pharmacy", "Mo-Sa 00:00-24:00"),
        feature("way/3", "pharmacy", "Mo-Su 00:00-24:00"),
    ]
    assert [f.osm_id for f in pharmacy_candidates(pharmacies)] == ["way/1", "way/3"]
