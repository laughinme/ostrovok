import numpy as np
import pytest

from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import LonLat


def test_projection_roundtrip_and_axes() -> None:
    projection = LocalProjection(LonLat(39.73, 43.60))
    points = np.array([[39.73, 43.60], [39.74, 43.60], [39.73, 43.61]])
    metric = projection.forward(points)
    np.testing.assert_allclose(metric[0], [0, 0], atol=1e-8)
    assert metric[1, 0] == pytest.approx(805, abs=2)
    assert metric[2, 1] == pytest.approx(1112, abs=1)
    np.testing.assert_allclose(projection.inverse(metric), points, atol=1e-12)


def test_projection_supports_ray_grid_and_dateline() -> None:
    projection = LocalProjection(LonLat(179.99, 0))
    points = np.array([[[-179.99, 0.0], [179.99, 0.01]]])
    assert projection.forward(points)[0, 0, 0] == pytest.approx(2224, abs=1)
    np.testing.assert_allclose(projection.inverse(projection.forward(points)), points)


@pytest.mark.parametrize("points", [np.array([1]), np.array([[np.nan, 2]])])
def test_projection_rejects_invalid_points(points: np.ndarray) -> None:
    with pytest.raises(ValueError, match="coordinate pairs"):
        LocalProjection(LonLat(39, 43)).forward(points)
