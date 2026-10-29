import json
from time import perf_counter

import numpy as np
from shapely import box

from app.domain.geo.facades import extract_facades
from app.domain.geo.horizon import evaluate_horizon
from app.domain.geo.montecarlo import monte_carlo
from app.domain.geo.projection import FloatArray, LocalProjection
from app.domain.geo.scene import Building
from app.domain.geo.types import LonLat
from app.infra.geo.view_scene import ViewSceneBuilder


class FlatTerrain:
    def elevation(self, points: FloatArray) -> FloatArray:
        return np.zeros(len(points))

    def far_horizon(
        self, origin: LonLat, eye_height_m: float, azimuths: FloatArray, max_km: float = 40
    ) -> tuple[FloatArray, FloatArray]:
        raise NotImplementedError


def benchmark() -> dict[str, float | int]:
    buildings = (
        Building("hotel", box(-10, -10, 10, 10), 10, 30, "osm_levels"),
        Building("neighbour", box(-70, -2000, -50, 2000), 0, 30, "default"),
    )
    walls = extract_facades(buildings[0].footprint)
    builder = ViewSceneBuilder(FlatTerrain(), LocalProjection(LonLat(39.7, 43.6)))
    start = perf_counter()
    prepared = [
        [
            builder.prepare(
                wall.point(f), wall.azimuth_deg, buildings, box(-50_000, -50_000, -300, 50_000)
            )
            for f in (0.25, 0.5, 0.75)
        ]
        for wall in walls
    ]
    preparation_s = perf_counter() - start
    start = perf_counter()
    for scenes in prepared:
        for floor in range(1, 11):
            for scene in scenes:
                evaluate_horizon(scene, 10 + (floor - 0.5) * 3)
    nominal_s = perf_counter() - start
    start = perf_counter()
    for scenes in prepared:
        for floor in range(1, 11):
            monte_carlo(scenes, 10 + (floor - 0.5) * 3, runs=16)
    mc_s = perf_counter() - start
    return {
        "facades": len(walls),
        "floors": 10,
        "windows_per_facade": 3,
        "rays_per_window": 141,
        "samples_per_ray": len(prepared[0][0].distances_m),
        "preparation_s": preparation_s,
        "nominal_s": nominal_s,
        "mc16_s": mc_s,
        "cold_nominal_s": preparation_s + nominal_s,
        "cold_mc16_s": preparation_s + mc_s,
    }


if __name__ == "__main__":
    print(json.dumps(benchmark(), indent=2))  # noqa: T201
