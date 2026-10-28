"""Compact precomputed nominal profiles; uncertain agent calculations still use full scenes."""

import hashlib
import json
from collections import OrderedDict
from dataclasses import asdict
from io import BytesIO
from pathlib import Path
from typing import Any
from zipfile import ZipFile

import numpy as np

from app.domain.catalog import HotelGeo
from app.domain.geo.panorama import WindowProfile
from app.domain.geo.peaks import VisiblePeak
from app.domain.geo.scene import Horizon, Obstacle
from app.domain.knowledge.scope import Facade

_CACHE_HOTELS = 4
PROFILE_FILE = "window_profiles.zip"
_SOURCES = (
    "hotels.csv.gz",
    "buildings.csv.gz",
    "dem.json",
    "dem_int16.npy",
    "sea.wkb.gz",
    "osm_features.csv.gz",
)


def source_hashes(directory: Path) -> dict[str, str]:
    result = {}
    for name in _SOURCES:
        with (directory / name).open("rb") as stream:
            result[name] = hashlib.file_digest(stream, "sha256").hexdigest()
    return result


def hotel_signature(hotel: HotelGeo) -> str:
    content = f"{hotel.footprint.wkb_hex}|{hotel.floors}|{hotel.height_m}"
    return hashlib.sha256(content.encode()).hexdigest()


def encode_profile(profile: WindowProfile) -> dict[str, Any]:
    horizon = profile.horizon
    rows = np.column_stack(
        (
            profile.azimuths_deg,
            horizon.angle_deg,
            horizon.kind,
            horizon.sea_low_deg,
            horizon.sea_high_deg,
        )
    )
    return {
        "rays": [[round(float(v), 5) if np.isfinite(v) else None for v in row] for row in rows],
        "peaks": [asdict(p) for p in profile.peaks],
        "minimumSeaFloor": profile.minimum_sea_floor,
        "eyeM": profile.eye_m,
    }


def decode_profile(raw: dict[str, Any]) -> WindowProfile:
    rows = np.asarray(raw["rays"], dtype=np.float64)
    kinds = rows[:, 2].astype(np.int8)
    angles = np.where(np.isnan(rows[:, 1]) & (kinds == Obstacle.SKY), -np.inf, rows[:, 1])
    low = np.where(np.isnan(rows[:, 3]), np.inf, rows[:, 3])
    high = np.where(np.isnan(rows[:, 4]), -np.inf, rows[:, 4])
    absent = np.full(len(rows), -np.inf)
    horizon = Horizon(angles, kinds, absent, absent, low, high, np.isfinite(low))
    return WindowProfile(
        rows[:, 0],
        horizon,
        tuple(VisiblePeak(**p) for p in raw["peaks"]),
        raw["minimumSeaFloor"],
        float(raw["eyeM"]),
    )


class WindowProfiles:
    def __init__(self, directory: Path) -> None:
        self._archive = ZipFile(BytesIO((directory / PROFILE_FILE).read_bytes()))
        raw = json.loads(self._archive.read("manifest.json"))
        if raw["version"] != 1 or raw["sources"] != source_hashes(directory):
            self._archive.close()
            raise ValueError("Window profiles do not match the region files; regenerate them")
        self._hotels: OrderedDict[str, dict[str, Any]] = OrderedDict()

    def get(self, hotel: HotelGeo, facade: Facade, floor: int) -> WindowProfile | None:
        if hotel.osm_id not in self._hotels:
            try:
                raw = self._archive.read(f"{hotel.osm_id}.json")
            except KeyError:
                return None
            self._hotels[hotel.osm_id] = json.loads(raw)
        self._hotels.move_to_end(hotel.osm_id)
        entry = self._hotels[hotel.osm_id]
        while len(self._hotels) > _CACHE_HOTELS:
            self._hotels.popitem(last=False)
        if entry["signature"] != hotel_signature(hotel):
            return None
        raw_profile = entry["profiles"].get(f"{facade.value}/{floor}")
        return decode_profile(raw_profile) if raw_profile is not None else None
