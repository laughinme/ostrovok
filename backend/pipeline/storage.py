import csv
import gzip
import hashlib
import io
import json
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "pipeline"
DATA = ROOT / "data"
REGION = DATA / "region"
USER_AGENT = "okno-hackathon/0.1 (team chupapis)"
OVERPASS = "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
MIRROR = {"endpoint": OVERPASS}


def download(url: str, *, query: str | None = None) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    key = hashlib.sha256((url + (query or "")).encode()).hexdigest()
    path = CACHE / key
    if path.exists():
        return path
    for attempt in range(4):
        endpoint = MIRROR["endpoint"] if query is not None and url == OVERPASS else url
        if query is not None and attempt >= 2:
            endpoint = (
                "https://overpass.kumi.systems/api/interpreter"
                if attempt == 2
                else "https://overpass.private.coffee/api/interpreter"
            )
        try:
            with httpx.Client(
                headers={"User-Agent": USER_AGENT},
                timeout=httpx.Timeout(120, connect=10),
                follow_redirects=True,
            ) as client:
                if query is not None:
                    response = (
                        client.get(endpoint, params={"data": query})
                        if attempt == 0
                        else client.post(endpoint, data={"data": query})
                    )
                    response.raise_for_status()
                    payload = response.json()
                    if payload.get("remark"):
                        raise ValueError(payload["remark"])
                    path.with_suffix(".part").write_bytes(response.content)
                else:
                    with client.stream("GET", url) as response:
                        response.raise_for_status()
                        with path.with_suffix(".part").open("wb") as target:
                            for chunk in response.iter_bytes():
                                target.write(chunk)
            if query is not None and url == OVERPASS:
                MIRROR["endpoint"] = endpoint
            path.with_suffix(".part").replace(path)
            path.with_suffix(".request.json").write_text(
                json.dumps(
                    {"url": endpoint, "query": query, "fetched_at": datetime.now(UTC).isoformat()}
                )
            )
            print(f"Cached {key[:10]}: {path.stat().st_size:,} bytes", flush=True)
            time.sleep(1)
            return path
        except (httpx.HTTPError, ValueError) as error:
            if attempt == 3:
                raise
            reason = (
                str(error.response.status_code)
                if isinstance(error, httpx.HTTPStatusError)
                else str(error)
            )
            print(f"Retry {attempt + 1}/4 at {endpoint}: {reason}", flush=True)
            time.sleep(3 * (attempt + 1))
    raise RuntimeError("Download retries exhausted")


def overpass(body: str, *, seconds: int = 180, memory: int | None = None) -> dict[str, Any]:
    allocation = f"[maxsize:{memory}]" if memory else ""
    query = f"[out:json][timeout:{seconds}]{allocation};{body};out meta geom;"
    return json.loads(download(OVERPASS, query=query).read_text())


def write_csv(name: str, fields: list[str], rows: list[dict[str, Any]]) -> None:
    REGION.mkdir(parents=True, exist_ok=True)
    with (
        (REGION / name).open("wb") as raw,
        gzip.GzipFile(filename="", fileobj=raw, mode="wb", mtime=0) as zipped,
        io.TextIOWrapper(zipped, encoding="utf-8", newline="") as stream,
    ):
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def read_csv(name: str) -> list[dict[str, str]]:
    csv.field_size_limit(50_000_000)
    with gzip.open(REGION / name, "rt", encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
