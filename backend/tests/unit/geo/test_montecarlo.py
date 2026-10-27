from dataclasses import replace

import numpy as np

from app.domain.geo.montecarlo import height_perturbations, monte_carlo
from tests.unit.geo.test_horizon import analytic_scene


def test_probability_extremes_reproducibility_and_uncertain_boundary() -> None:
    scene = analytic_scene(building=True)
    assert monte_carlo([scene], 10, runs=16).probability == 0
    assert monte_carlo([scene], 50, runs=16).probability == 1
    result = monte_carlo([scene], 30, runs=64)
    assert 0 < result.probability < 1
    np.testing.assert_array_equal(result.fractions, monte_carlo([scene], 30, runs=64).fractions)


def test_window_geometry_is_sampled_and_never_reused_at_wrong_origin() -> None:
    blocked, clear = analytic_scene(building=True), analytic_scene()
    clear = type(clear)(
        clear.azimuths_deg,
        clear.distances_m,
        clear.terrain_m,
        clear.sea,
        clear.hits,
        buildings=blocked.buildings,
    )
    result = monte_carlo([blocked, clear], 10, runs=64)
    assert 0 < result.probability < 1
    np.testing.assert_array_equal(result.fractions > 0, result.window_indices == 1)


def test_height_errors_follow_provenance() -> None:
    original = analytic_scene(building=True).buildings[0]
    buildings = [
        replace(original, height_source=source)
        for source in ["osm_height", "osm_levels", "default"]
    ]
    offsets = height_perturbations(buildings, 500, np.random.default_rng(10))
    assert np.max(np.abs(offsets[:, 0])) <= 1.5
    assert set(offsets[:, 1]) == {-3, 0, 3}
    assert set(offsets[:, 2]) == {-6, -3, 0, 3, 6}
