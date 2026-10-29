from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.domain.knowledge.scope import Facade
from app.service.agents.runtime import Tracer
from app.service.recipes.executor import MethodCall, NoDataError
from app.service.recipes.methods.view import ViewExecutor
from app.service.recipes.models import ViewRecipe
from tests.unit.geo.view_factory import view_environment


def method_call(hotel, recipe):
    tracer = SimpleNamespace(tool=AsyncMock())

    tracer.timed = lambda name, args=None: Tracer.timed(tracer, name, args)
    return MethodCall(hotel, SimpleNamespace(version=1), recipe, tracer)


async def test_view_probability_scope_attribution_and_tool_chain() -> None:
    hotel, env = view_environment(floors=2)
    call = method_call(hotel, ViewRecipe(target="sea"))
    findings = await ViewExecutor().collect(call, env)
    south = next(f for f in findings if f.scope.facades == {Facade.S})
    north = next(f for f in findings if f.scope.facades == {Facade.N})
    assert south.value is True
    assert south.confidence == 1
    assert north.value is False
    assert north.confidence == 1
    assert south.scope.floor_from == south.scope.floor_to == 1
    evidence = south.evidence[0]
    assert evidence.params["runs"] == 16
    assert "Copernicus" in evidence.attribution
    assert "OpenStreetMap" in evidence.attribution
    assert [c.args[0] for c in call.tracer.tool.call_args_list] == [
        "facades.of",
        "buildings.near",
        "geo.horizon",
        "geo.montecarlo",
    ]
    env.extras["mc_runs"] = 50
    findings = await ViewExecutor().collect(call, env)
    assert findings[0].evidence[0].params["runs"] == 50


async def test_no_sea_mask_requests_fallback() -> None:
    hotel, env = view_environment()
    env.sea = None
    with pytest.raises(NoDataError, match="маски моря"):
        await ViewExecutor().collect(method_call(hotel, ViewRecipe(target="sea")), env)
