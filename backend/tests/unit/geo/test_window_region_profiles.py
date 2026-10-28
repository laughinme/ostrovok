import json
from pathlib import Path
from zipfile import ZipFile

from app.infra.geo.window_profiles import PROFILE_FILE, WindowProfiles, hotel_signature
from pipeline.window_inputs import hotels

REGION = Path(__file__).resolve().parents[3] / "data" / "region"


def test_region_profiles_cover_every_real_facade_and_floor() -> None:
    profiles = WindowProfiles(REGION)
    with ZipFile(REGION / PROFILE_FILE) as archive:
        assert len(archive.namelist()) == 201
        for hotel in hotels(REGION):
            raw = json.loads(archive.read(f"{hotel.osm_id}.json"))
            expected = {
                f"{f.value}/{floor}" for f in hotel.facades for floor in range(1, hotel.floors + 1)
            }
            assert set(raw["profiles"]) == expected
            assert raw["signature"] == hotel_signature(hotel)
            for facade in hotel.facades:
                sample = profiles.get(hotel, facade, hotel.floors)
                assert sample is not None
                assert len(sample.azimuths_deg) == 141
