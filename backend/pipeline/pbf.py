import hashlib
import json
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import httpx
import pyogrio
from shapely import box

from pipeline.geography import REGION_BOUNDS, metric, wgs84
from pipeline.storage import ROOT, USER_AGENT, write_json

OSM_CACHE = ROOT / ".cache" / "osm"
SNAPSHOT = "south-fed-district-261026.osm.pbf"
SOURCE = f"https://download.geofabrik.de/russia/{SNAPSHOT}"
COAST_SOURCE = "https://download.geofabrik.de/europe/georgia-261026.osm.pbf"
CONFIG = Path(__file__).with_name("osmconf.ini")
LAYERS = ("points", "lines", "multipolygons")
KEYS = (
    "barrier",
    "building",
    "highway",
    "railway",
    "natural",
    "aeroway",
    "amenity",
    "shop",
    "tourism",
    "leisure",
    "healthcare",
    "landuse",
    "public_transport",
)


def checksum(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "md5").hexdigest()


def snapshot(url: str = SOURCE) -> Path:
    OSM_CACHE.mkdir(parents=True, exist_ok=True)
    path = OSM_CACHE / Path(urlsplit(url).path).name
    stamp = path.with_suffix(".source.json")
    if path.exists() and stamp.exists():
        metadata = json.loads(stamp.read_text())
        if metadata["bytes"] == path.stat().st_size and metadata["md5"] == checksum(path):
            return path
    with httpx.Client(
        headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=120
    ) as client:
        response = client.get(url + ".md5")
        response.raise_for_status()
        expected = response.text.split()[0]
        if path.exists():
            if checksum(path) != expected:
                raise ValueError(f"Incomplete OSM snapshot (download still running?): {path}")
        else:
            temporary = path.with_suffix(".download")
            with client.stream("GET", url) as response:
                response.raise_for_status()
                with temporary.open("wb") as stream:
                    for chunk in response.iter_bytes(1024 * 1024):
                        stream.write(chunk)
            if checksum(temporary) != expected:
                raise ValueError("Geofabrik snapshot checksum mismatch")
            temporary.replace(path)
    write_json(stamp, {"url": url, "md5": expected, "bytes": path.stat().st_size})
    return path


def regional_cache(source: Path | None = None) -> Path:
    source = source or snapshot()
    digest = hashlib.sha256(CONFIG.read_bytes() + str(REGION_BOUNDS).encode()).hexdigest()[:12]
    target = OSM_CACHE / f"{source.stem}-{digest}.gpkg"
    metadata = target.with_suffix(".json")
    identity = {"source_md5": checksum(source), "config": digest}
    if target.exists() and metadata.exists() and json.loads(metadata.read_text()) == identity:
        return target
    temporary = target.with_name(target.stem + ".part.gpkg")
    temporary.unlink(missing_ok=True)
    bounds = wgs84(metric(box(*REGION_BOUNDS)).buffer(40_000)).bounds
    where = " OR ".join(f"{key} IS NOT NULL" for key in KEYS)
    for layer in LAYERS:
        frame = pyogrio.read_dataframe(
            source,
            layer=layer,
            bbox=bounds,
            where=where,
            CONFIG_FILE=str(CONFIG),
            INTERLEAVED_READING=True,
        )
        frame["all_tags"] = frame["all_tags"].map(
            lambda value: (
                json.dumps(value, ensure_ascii=False, sort_keys=True)
                if isinstance(value, dict)
                else value
            )
        )
        pyogrio.write_dataframe(frame, temporary, layer=layer, driver="GPKG")
        print(f"OSM regional cache / {layer}: {len(frame):,}", flush=True)
    temporary.replace(target)
    write_json(metadata, identity)
    return target


def records(cache: Path, layer: str, *, where: str | None = None) -> list[dict[str, Any]]:
    frame = pyogrio.read_dataframe(cache, layer=layer, where=where)
    result = []
    for row in frame.to_dict("records"):
        shape = row["geometry"]
        if shape is None or shape.is_empty:
            continue
        way_id = row.get("osm_way_id")
        ref = row.get("osm_id")
        if layer == "multipolygons":
            ref = f"way/{way_id}" if isinstance(way_id, str) else f"relation/{ref}"
        else:
            ref = f"{'node' if layer == 'points' else 'way'}/{ref}"
        result.append(
            {"osm_id": ref, "tags": json.loads(row.get("all_tags") or "{}"), "geometry": shape}
        )
    return result


def regional_records(layer: str, *, where: str | None = None) -> list[dict[str, Any]]:
    result = {}
    for url in (SOURCE, COAST_SOURCE):
        cache = regional_cache(snapshot(url))
        for record in records(cache, layer, where=where):
            result.setdefault(record["osm_id"], record)
    return list(result.values())


def run() -> None:
    for url in (SOURCE, COAST_SOURCE):
        print(f"OSM cache ready: {regional_cache(snapshot(url))}", flush=True)
