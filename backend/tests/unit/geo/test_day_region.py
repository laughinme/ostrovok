from datetime import date

import pytest

from app.api.schemas.day import DayPlanOut
from app.domain.geo.visits import open_for
from app.service.geo.day import build_day
from tests.unit.geo.region_factory import DAY_HOTELS, REGION, regional_day_environment


@pytest.fixture(scope="module")
def regional_scene():
    if not (REGION / "walk_graph.npz").exists():
        pytest.skip("B1.5 walking graph not published")
    return regional_day_environment()


@pytest.mark.parametrize("osm_id", DAY_HOTELS)
async def test_day_on_three_real_hotels(regional_scene, osm_id) -> None:
    hotels, env = regional_scene
    plan = await build_day(hotels[osm_id], env, date(2026, 11, 12))
    wire = DayPlanOut.from_plan(plan).model_dump(mode="json")
    assert len(plan.slots) == 6
    assert [s.at for s in plan.slots] == sorted(s.at for s in plan.slots)
    assert 16 <= plan.sunset.at.hour <= 18
    beach = next(s for s in plan.slots if s.title == "Утро у моря")
    assert beach.route is not None
    assert not beach.route.walk.estimated
    for slot in plan.slots:
        if slot.route is not None:
            route = slot.route.walk.route
            assert route is not None
            assert route.origin == hotels[osm_id].location
            assert route.there.minutes <= 40
            assert route.back.minutes > 0
            assert len(slot.route.elevation_profile) > 1
        else:
            assert slot.unavailable_reason is not None or plan.sunset.from_window
        if slot.title == "Кофе или завтрак" and slot.place:
            assert open_for(slot.opening_hours, slot.at, 30)
    assert wire["hotelId"] == str(plan.hotel_id)
    assert wire["date"] == "2026-11-12"
