import asyncio
import gzip
import hashlib
import json
from pathlib import Path
from time import perf_counter
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

from shapely import from_wkb
from shapely.prepared import prep

from app.domain.catalog import HotelGeo
from app.domain.geo.horizon import evaluate_horizon
from app.domain.geo.panorama import WindowProfile
from app.domain.geo.peaks import visible_peaks
from app.domain.geo.sea import minimum_floor
from app.infra.geo.terrain import NpyTerrain
from app.infra.geo.window_profiles import (
    PROFILE_FILE,
    PROFILE_VERSION,
    encode_profile,
    hotel_signature,
    source_hashes,
)
from app.service.geo.scenes import scene_cache
from app.service.ports import SystemClock
from app.service.recipes.executor import Environment
from pipeline.window_inputs import RegionViewReader, hotels

REGION = Path(__file__).resolve().parents[1] / "data" / "region"


async def generate(directory: Path = REGION) -> None:
    env = Environment(
        RegionViewReader(directory),
        SystemClock(),
        terrain=NpyTerrain(directory),
        sea=prep(from_wkb(gzip.decompress((directory / "sea.wkb.gz").read_bytes()))),
    )
    output = directory / PROFILE_FILE
    sources = source_hashes(directory)
    revision = {"version": PROFILE_VERSION, "sources": sources}
    key = hashlib.sha256(json.dumps(revision, sort_keys=True).encode()).hexdigest()[:16]
    checkpoint = directory.parents[1] / ".cache" / "window_profiles" / key
    checkpoint.mkdir(parents=True, exist_ok=True)
    temporary = checkpoint / "output.tmp"
    start = perf_counter()
    with ZipFile(temporary, "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
        _write(archive, "manifest.json", json.dumps(revision))
        for index, hotel in enumerate(hotels(directory), start=1):
            cached = checkpoint / f"{hotel.osm_id.replace('/', '_')}.json.gz"
            if cached.exists():
                raw = gzip.decompress(cached.read_bytes()).decode()
            else:
                raw = await _hotel_profiles(hotel, env)
                cached.write_bytes(gzip.compress(raw.encode(), mtime=0))
            _write(archive, f"{hotel.osm_id}.json", raw)
            count = len(json.loads(raw)["profiles"])
            print(
                f"{index}/200 {hotel.name}: {count} profiles · {perf_counter() - start:.1f}s",
                flush=True,
            )
    temporary.replace(output)
    print(f"{output.name}: {output.stat().st_size / 1024**2:.2f} MB")


async def _hotel_profiles(hotel: HotelGeo, env: Environment) -> str:
    cache = scene_cache(env)
    cache.clear()
    scene = await cache.get(hotel, env)
    profiles = {}
    for facade in hotel.facades:
        windows = scene.prepare(facade)
        first = minimum_floor(windows, scene.base_m, hotel.floors)
        for floor in range(1, hotel.floors + 1):
            eye = scene.eye(floor)
            profile = WindowProfile(
                windows[1].azimuths_deg,
                evaluate_horizon(windows[1], eye),
                visible_peaks(windows[1], eye, scene.peaks),
                first,
                eye,
            )
            profiles[f"{facade.value}/{floor}"] = encode_profile(profile)
    return json.dumps(
        {"signature": hotel_signature(hotel), "profiles": profiles}, ensure_ascii=False
    )


def _write(archive: ZipFile, name: str, text: str) -> None:
    member = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
    member.compress_type = ZIP_DEFLATED
    archive.writestr(member, text, compresslevel=6)


def run() -> None:
    asyncio.run(generate())


if __name__ == "__main__":
    run()
