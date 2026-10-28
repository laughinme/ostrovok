from dataclasses import replace

import numpy as np
import pytest
from shapely import MultiPolygon, box, transform

from app.domain.geo.horizon import evaluate_horizon
from app.domain.knowledge.scope import Facade
from app.service.geo.scenes import scene_cache
from app.service.recipes.executor import NoDataError
from tests.unit.geo.view_factory import FlatTerrain, view_environment


async def test_scenes_use_real_walls_keep_self_occlusion_and_reuse_geometry() -> None:
    hotel, env = view_environment()
    cache = scene_cache(env)
    scene = await cache.get(hotel, env)
    assert await cache.get(hotel, env) is scene
    windows = scene.prepare(Facade.S)
    assert len(windows) == 3
    assert len({w.origin_xy for w in windows}) == 3
    assert scene.prepare(Facade.S) is windows
    assert any(b.ref == hotel.osm_id for b in scene.buildings)
    assert evaluate_horizon(windows[1], scene.eye(5)).sea_fraction > 0.9
    assert scene.peaks[0].name == "Гора"
    cache.clear()
    assert await cache.get(hotel, env) is not scene


async def test_missing_terrain_and_invalid_facade_do_not_become_negative_evidence() -> None:
    hotel, env = view_environment()
    env.terrain = None
    with pytest.raises(NoDataError):
        await scene_cache(env).get(hotel, env)
    hotel, env = view_environment()
    scene = await scene_cache(env).get(replace(hotel, facades=(Facade.S,)), env)
    with pytest.raises(ValueError, match="Facade"):
        scene.prepare(Facade.N)


async def test_multipolygon_hotel_windows_use_main_body_and_keep_other_wings() -> None:
    hotel, env = view_environment()
    frame = (await scene_cache(env).get(hotel, env)).frame
    wing = transform(box(30, -10, 40, 0), frame.projection.inverse)
    hotel = replace(hotel, footprint=MultiPolygon([hotel.footprint, wing]))
    env.reader.hotel = hotel
    scene = await scene_cache(env).get(hotel, env)
    assert sum(b.ref == hotel.osm_id for b in scene.buildings) == 2
    assert len(scene.prepare(Facade.S)) == 3


class MissingNorthTerrain(FlatTerrain):
    def elevation(self, points: np.ndarray) -> np.ndarray:
        return np.where(points[:, 1] > 43.62, np.nan, 0.0)


async def test_missing_land_samples_request_fallback_instead_of_certain_negative() -> None:
    hotel, env = view_environment()
    env.terrain = MissingNorthTerrain()
    scene = await scene_cache(env).get(hotel, env)
    with pytest.raises(NoDataError, match="покрытия рельефа"):
        scene.prepare(Facade.N)
