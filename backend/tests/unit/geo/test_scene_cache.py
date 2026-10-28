from dataclasses import replace

import pytest

from app.domain.geo.horizon import evaluate_horizon
from app.domain.knowledge.scope import Facade
from app.service.geo.scenes import scene_cache
from app.service.recipes.executor import NoDataError
from tests.unit.geo.view_factory import view_environment


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
