import numpy as np

from app.domain.geo.horizon import batch_horizon
from app.domain.geo.montecarlo import monte_carlo
from app.domain.geo.peaks import Peak, mountain_visibility, visible_peaks
from tests.unit.geo.test_horizon import analytic_scene


def test_named_peak_visible_but_lower_peak_and_outside_fov_are_not() -> None:
    scene = analytic_scene(ridge=True)
    peaks = [
        Peak("node/1", "Высокая", (-5000, 0), 2000),
        Peak("node/2", "Низкая", (-5000, 0), 500),
        Peak("node/3", "За спиной", (5000, 0), 2000),
        Peak("node/4", "Слишком далеко", (-50_000, 0), 3000),
    ]
    result = visible_peaks(scene, 15, peaks)
    assert [peak.name for peak in result] == ["Высокая"]
    assert result[0].distance_m == 5000
    assert result[0].azimuth_deg == 270


def test_mountain_silhouette_and_monte_carlo() -> None:
    ridge = analytic_scene(ridge=True)
    profiles = batch_horizon(ridge, np.array([15.0]))
    assert np.all(mountain_visibility(ridge, np.array([15.0]), profiles))
    assert monte_carlo([ridge], 15, target="mountains").probability == 1
    assert monte_carlo([analytic_scene()], 15, target="mountains").probability == 0
