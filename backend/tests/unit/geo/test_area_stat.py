from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock

import numpy as np
import pytest

from app.domain.geo.projection import LocalProjection
from app.domain.geo.slopes import SlopeSample, slope_stat
from app.domain.geo.types import LonLat
from app.infra.geo.area import GraphAreaSlopes
from app.service.geo.area import slopes_near
from app.service.recipes.executor import NoDataError
from app.service.recipes.methods.area_stat import AreaStatExecutor
from app.service.recipes.models import AreaStatRecipe
from tests.unit.geo.graph_factory import make_graph

ORIGIN = LonLat(39.7, 43.6)


def test_physical_edges_count_once_and_crossing_edges_are_included() -> None:
    graph = make_graph(
        [(39.696, 43.6, 0), (39.704, 43.6, 80), (39.7, 43.6005, 80)],
        [(0, 1), (1, 0), (1, 2), (2, 1)],
        [640, 640, 340, 340],
    )
    graph = replace(graph, osm_refs=("way/1", "way/1", "way/2", "way/2"))
    stat = GraphAreaSlopes(graph).within(ORIGIN, 100)
    assert stat is not None
    assert len(stat.samples) == 2
    assert stat.share == 0.5
    assert not stat.estimated


def test_strict_slope_threshold_and_empty_unknown() -> None:
    samples = tuple(SlopeSample(((0, 0),), s) for s in (0.08, -0.08, -0.081))
    assert slope_stat(samples).share == pytest.approx(1 / 3)
    with pytest.raises(ValueError, match="nonempty"):
        slope_stat(())


def test_dem_plane_gradient_and_missing_coverage() -> None:
    projection = LocalProjection(ORIGIN)
    terrain = SimpleNamespace(elevation=lambda points: projection.forward(points)[:, 0] * 0.1)
    env = SimpleNamespace(extras={}, terrain=terrain)
    stat = slopes_near(env, ORIGIN, 300)
    assert stat.estimated
    assert stat.share == 1
    assert all(s.slope == pytest.approx(0.1) for s in stat.samples)
    terrain.elevation = lambda points: np.full(len(points), np.nan)
    with pytest.raises(NoDataError, match="покрытия"):
        slopes_near(env, ORIGIN, 300)


async def test_executor_records_boolean_threshold_and_map() -> None:
    recipe = AreaStatRecipe(metric="steep_share", threshold=0.25)
    tracer = SimpleNamespace(tool=AsyncMock())
    call = SimpleNamespace(
        recipe_of=lambda _kind: recipe,
        hotel=SimpleNamespace(location=ORIGIN),
        characteristic=SimpleNamespace(version=1),
        tracer=tracer,
    )
    sample = slope_stat((SlopeSample(((39.7, 43.6),), 0.2, "way/1"),))
    env = SimpleNamespace(extras={"area_slopes": SimpleNamespace(within=lambda *_args: sample)})
    (finding,) = await AreaStatExecutor().collect(call, env)
    assert finding.value is True
    assert finding.evidence[0].params["share"] == 1
    assert finding.evidence[0].osm_refs == ("way/1",)
    tracer.tool.assert_awaited_once()
