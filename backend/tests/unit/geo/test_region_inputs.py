"""Offline smoke checks become active when codex-pipeline publishes region files."""

from datetime import date
from pathlib import Path

import pytest

from app.domain.geo.types import LonLat, WalkProfile
from app.infra.geo.climate import ClimateCatalog
from app.infra.geo.router import ScipyRouter

REGION = Path(__file__).resolve().parents[3] / "data" / "region"


@pytest.mark.skipif(
    not (REGION / "climate.json").exists(), reason="B1.4 climate.json not published"
)
def test_real_climate_archive_contract() -> None:
    catalog = ClimateCatalog.from_file(REGION / "climate.json")
    assert catalog.source
    for station in catalog.stations:
        result = catalog.estimate(station.location, date(2026, 11, 1), date(2026, 11, 8))
        assert result.values
        assert any(value is not None for value in result.values.values())


@pytest.mark.skipif(
    not (REGION / "walk_graph.npz").exists(), reason="B1.5 walk_graph.npz not published"
)
def test_real_walking_archive_contract() -> None:
    router = ScipyRouter.from_file(REGION / "walk_graph.npz")
    graph = router.graph
    assert len(graph.edges) > 0
    start, end = graph.edges[0]
    origin = LonLat(float(graph.nodes[start, 0]), float(graph.nodes[start, 1]))
    target = LonLat(float(graph.nodes[end, 0]), float(graph.nodes[end, 1]))
    assert router.snap(origin).distance_m < 0.01
    places = router.reachable(origin, [("edge/0", None, target)], 24 * 60, WalkProfile.WALK)
    assert places
    assert 0 <= places[0].minutes <= 24 * 60
