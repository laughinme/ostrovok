import json
from dataclasses import replace
from zipfile import ZipFile

import numpy as np
import pytest

from app.domain.geo.horizon import evaluate_horizon
from app.domain.geo.panorama import WindowProfile
from app.domain.knowledge.scope import Facade
from app.infra.geo.window_profiles import (
    PROFILE_FILE,
    WindowProfiles,
    decode_profile,
    encode_profile,
    hotel_signature,
    source_hashes,
)
from app.service.geo.scenes import scene_cache
from tests.unit.geo.view_factory import view_environment


async def test_profile_roundtrip_preserves_sea_and_unknown_skyline() -> None:
    hotel, env = view_environment()
    scene = await scene_cache(env).get(hotel, env)
    window = scene.prepare(Facade.S)[1]
    horizon = evaluate_horizon(window, scene.eye(5))
    profile = WindowProfile(window.azimuths_deg, horizon, (), 1, scene.eye(5))
    decoded = decode_profile(json.loads(json.dumps(encode_profile(profile), allow_nan=False)))
    np.testing.assert_allclose(decoded.horizon.angle_deg, horizon.angle_deg, atol=1e-5)
    np.testing.assert_array_equal(decoded.horizon.sea_visible, horizon.sea_visible)
    assert decoded.minimum_sea_floor == 1
    assert decoded.eye_m == scene.eye(5)


async def test_snapshot_checks_sources_and_hotel_shape(tmp_path) -> None:
    hotel, env = view_environment()
    scene = await scene_cache(env).get(hotel, env)
    window = scene.prepare(Facade.S)[1]
    profile = WindowProfile(
        window.azimuths_deg, evaluate_horizon(window, scene.eye(5)), (), 1, 13.5
    )
    for name in (
        "hotels.csv.gz",
        "buildings.csv.gz",
        "dem.json",
        "dem_int16.npy",
        "sea.wkb.gz",
        "osm_features.csv.gz",
    ):
        (tmp_path / name).write_bytes(b"source")
    with ZipFile(tmp_path / PROFILE_FILE, "w") as archive:
        archive.writestr(
            "manifest.json", json.dumps({"version": 1, "sources": source_hashes(tmp_path)})
        )
        archive.writestr(
            f"{hotel.osm_id}.json",
            json.dumps(
                {
                    "signature": hotel_signature(hotel),
                    "profiles": {"S/5": encode_profile(profile)},
                }
            ),
        )
    profiles = WindowProfiles(tmp_path)
    assert profiles.get(hotel, Facade.S, 5) is not None
    assert profiles.get(replace(hotel, floors=10), Facade.S, 5) is None
    assert profiles.get(hotel, Facade.N, 5) is None
    (tmp_path / "dem.json").write_bytes(b"changed")
    with pytest.raises(ValueError, match="regenerate"):
        WindowProfiles(tmp_path)
