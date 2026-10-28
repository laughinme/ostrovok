from dataclasses import replace
from datetime import date

import numpy as np

from app.domain.geo.horizon import evaluate_horizon
from app.domain.geo.scene import Obstacle
from app.domain.geo.solar_visibility import event_visible, solar_intersection
from app.domain.geo.sun import sun_events
from app.domain.knowledge.scope import Facade
from app.service.geo.scenes import scene_cache
from app.service.recipes.methods.sun_event import SunEventExecutor
from app.service.recipes.models import SunEventRecipe
from tests.unit.geo.test_view_executor import method_call
from tests.unit.geo.view_factory import view_environment


async def test_sunset_seasonality_scope_and_evidence_times() -> None:
    hotel, env = view_environment(floors=1)
    hotel = replace(hotel, facades=(Facade.W,))
    call = method_call(hotel, SunEventRecipe(event="sunset", over="sea"))
    findings = await SunEventExecutor().collect(call, env)
    by_month = {next(iter(f.scope.months)): f for f in findings}
    assert len(findings) == 12
    assert by_month[1].value is True
    assert by_month[6].value is False
    assert by_month[1].scope.facades == {Facade.W}
    assert by_month[1].scope.floor_from == by_month[1].scope.floor_to == 1
    params = by_month[1].evidence[0].params
    assert params["time"] is not None
    assert params["timezone"] == "Europe/Moscow"
    assert [c.args[0] for c in call.tracer.tool.call_args_list] == [
        "geo.horizon",
        "sun.path",
        "visibility",
    ]


async def test_sunrise_and_delayed_appearance_behind_terrain() -> None:
    hotel, env = view_environment(floors=1)
    hotel = replace(hotel, facades=(Facade.E,))
    findings = await SunEventExecutor().collect(
        method_call(hotel, SunEventRecipe(event="sunrise", over="any")),
        env,
    )
    assert any(f.value for f in findings)
    scene = await scene_cache(env).get(hotel, env)
    window = scene.prepare(Facade.E)[1]
    horizon = evaluate_horizon(window, scene.eye(1))
    blocked = replace(
        horizon,
        angle_deg=np.full_like(horizon.angle_deg, 10),
        kind=np.full_like(horizon.kind, Obstacle.TERRAIN),
    )
    day = date(2026, 11, 12)
    event = sun_events(hotel.location, day).sunrise
    assert not event_visible(event, window, blocked, over_sea=False)
    crossing = solar_intersection(hotel.location, day, window, blocked, event="sunrise")
    assert crossing is not None
    assert crossing.position.at > event.at
    assert crossing.behind == "гора"
