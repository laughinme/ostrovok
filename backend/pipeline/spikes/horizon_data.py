"""Network/cache adapters and OSM geometry for the standalone horizon experiment."""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import numpy as np
import rasterio
from pyproj import Transformer
from shapely import LineString, Point, Polygon, box, make_valid, transform, union_all
from shapely.geometry import mapping, shape
from shapely.ops import polygonize, unary_union

CACHE = Path(__file__).resolve().parents[2] / ".cache" / "spike"
OVERPASS = "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
USER_AGENT = "okno-hackathon/0.1"
HOTELS = {
    "zhemchuzhina": 51847429,
    "morskaya_zvezda": 53549358,
    "marriott_polyana": 227214566,
}
COAST_BOUNDS = (39.0, 43.0, 40.9, 44.2)


def cached_download(name: str, url: str, query: str | None = None) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if path.exists():
        return path
    for attempt in range(6):
        endpoint = url
        try:
            with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=240) as client:
                if query is not None:
                    response = client.post(endpoint, data={"data": query})
                    response.raise_for_status()
                    payload = response.json()
                    if "remark" in payload:
                        raise ValueError(payload["remark"])
                    path.with_suffix(".part").write_bytes(response.content)
                else:
                    with client.stream("GET", url) as response:
                        response.raise_for_status()
                        with path.with_suffix(".part").open("wb") as target:
                            for chunk in response.iter_bytes():
                                target.write(chunk)
            path.with_suffix(".part").replace(path)
            path.with_suffix(".source.json").write_text(
                json.dumps(
                    {
                        "url": endpoint,
                        "query": query,
                        "fetched_at": datetime.now(UTC).isoformat(),
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
            print(f"Скачано {name}: {path.stat().st_size / 1e6:.2f} MB", flush=True)
            return path
        except (httpx.HTTPError, ValueError) as error:
            if attempt == 5:
                raise
            print(f"Повтор загрузки {name}: {type(error).__name__} ({endpoint})", flush=True)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("Unreachable download state")


def osm_query(name: str, body: str) -> dict[str, Any]:
    path = cached_download(name, OVERPASS, f"[out:json][timeout:180];{body};out meta geom;")
    return json.loads(path.read_text())


def load_hotels() -> dict[str, dict[str, Any]]:
    ids = ",".join(map(str, HOTELS.values()))
    elements = osm_query("selected_hotels.json", f"way(id:{ids})")["elements"]
    by_id = {element["id"]: element for element in elements}
    return {key: by_id[osm_id] for key, osm_id in HOTELS.items()}


def local_projection(lon: float, lat: float) -> tuple[Transformer, Transformer]:
    crs = f"+proj=aeqd +lat_0={lat} +lon_0={lon} +datum=WGS84 +units=m"
    return (
        Transformer.from_crs(4326, crs, always_xy=True),
        Transformer.from_crs(crs, 4326, always_xy=True),
    )


def project_geometry(projection: Transformer, geometry: Any) -> Any:
    return transform(geometry, lambda xy: np.column_stack(projection.transform(xy[:, 0], xy[:, 1])))


def way_line(geometry: list[dict[str, float]]) -> LineString:
    return LineString([(point["lon"], point["lat"]) for point in geometry])


def osm_polygon(element: dict[str, Any]) -> Any:
    if element["type"] == "way":
        coords = list(way_line(element["geometry"]).coords)
        if coords[0] != coords[-1]:
            raise ValueError(f"Open building way {element['id']}")
        return make_valid(Polygon(coords))
    outer: list[Any] = []
    inner: list[Any] = []
    for member in element.get("members", []):
        if member["type"] == "way" and member.get("geometry"):
            (inner if member.get("role") == "inner" else outer).append(way_line(member["geometry"]))
    shell = unary_union(list(polygonize(unary_union(outer))))
    holes = unary_union(list(polygonize(unary_union(inner))))
    return make_valid(shell.difference(holes))


def sea_polygon(projection: Transformer) -> Any:
    west, south, east, north = COAST_BOUNDS
    data = osm_query("coastline.json", f'way["natural"="coastline"]({south},{west},{north},{east})')
    bounds = project_geometry(projection, box(*COAST_BOUNDS))
    lines = [
        project_geometry(projection, way_line(e["geometry"])).intersection(bounds)
        for e in data["elements"]
    ]
    faces = list(polygonize(union_all([bounds.boundary, *lines], grid_size=0.01)))
    # OSM coastlines run with land on the left and water on the right.
    water_probes: list[Any] = []
    for element in data["elements"]:
        coords = np.array(project_geometry(projection, way_line(element["geometry"])).coords)
        vectors = np.diff(coords, axis=0)
        lengths = np.linalg.norm(vectors, axis=1)
        valid = lengths > 1
        right = np.column_stack((vectors[valid, 1], -vectors[valid, 0])) / lengths[valid, None]
        mids = (coords[:-1][valid] + coords[1:][valid]) / 2
        water_probes.extend(Point(p) for p in (mids + right * 2)[::20])
    sea = unary_union([face for face in faces if any(face.contains(p) for p in water_probes)])
    ocean_anchor = Point(projection.transform(39.6, 43.45))
    if sea.contains(Point(0, 0)) or not sea.contains(ocean_anchor):
        raise ValueError("Sea mask failed known land/ocean control points")
    if sea.is_empty or len(faces) < 2:
        raise ValueError("Coastline did not divide the region into land and sea")
    return sea


@dataclass(frozen=True)
class Building:
    osm_id: str
    polygon: Any
    tags: dict[str, str]
    height: float
    height_source: str


def positive_number(value: str | None) -> float | None:
    if value is None:
        return None
    match = re.fullmatch(r"\s*(\d+(?:[.,]\d+)?)\s*(m|метр(?:а|ов)?)?\s*", value)
    if match is None:
        return None
    number = float(match[1].replace(",", "."))
    return number if number > 0 else None


def building_height(tags: dict[str, str]) -> tuple[float, str]:
    if (height := positive_number(tags.get("height"))) is not None:
        return height, "height"
    if (levels := positive_number(tags.get("building:levels"))) is not None:
        return levels * 3, "building:levels"
    return 9.0, "default"


def load_buildings(lat: float, lon: float, key: str, projection: Transformer) -> list[Building]:
    delta_lat = 2000 / 111_000
    delta_lon = 2000 / (111_000 * np.cos(np.radians(lat)))
    south, west = np.floor(np.array([lat - delta_lat, lon - delta_lon]) * 1000) / 1000
    north, east = np.ceil(np.array([lat + delta_lat, lon + delta_lon]) * 1000) / 1000
    bounds = f"{south},{west},{north},{east}"
    data = osm_query(
        f"{key}_buildings.json",
        f'(way["building"]({bounds});rel["building"]({bounds});)',
    )
    member_ids = {
        m["ref"]
        for e in data["elements"]
        if e["type"] == "relation"
        for m in e.get("members", [])
        if m["type"] == "way"
    }
    buildings = []
    for element in data["elements"]:
        if "building" not in element.get("tags", {}):
            continue
        if element["type"] == "way" and element["id"] in member_ids:
            continue
        polygon = project_geometry(projection, osm_polygon(element))
        if polygon.is_empty or polygon.area < 1 or polygon.distance(Point(0, 0)) > 2000:
            continue
        height, source = building_height(element["tags"])
        buildings.append(
            Building(f"{element['type']}/{element['id']}", polygon, element["tags"], height, source)
        )
    return buildings


def load_railways(lat: float, lon: float, key: str, projection: Transformer) -> Any:
    data = osm_query(f"{key}_railways.json", f'way["railway"="rail"](around:2000,{lat},{lon})')
    return unary_union(
        [project_geometry(projection, way_line(e["geometry"])) for e in data["elements"]]
    )


class Dem:
    """Load full COG tiles once; sample arrays without one GDAL call per point."""

    def __init__(self) -> None:
        self.tiles: dict[tuple[int, int], tuple[Any, np.ndarray]] = {}

    def sample(self, lon: np.ndarray, lat: np.ndarray) -> np.ndarray:
        lon, lat = np.broadcast_arrays(lon, lat)
        heights = np.full(lon.shape, np.nan)
        tile_lon, tile_lat = np.floor(lon).astype(int), np.floor(lat).astype(int)
        for y, x in set(zip(tile_lat.ravel(), tile_lon.ravel(), strict=True)):
            key = int(y), int(x)
            if key not in self.tiles:
                name = f"Copernicus_DSM_COG_10_N{y:02d}_00_E{x:03d}_00_DEM"
                url = f"https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif"
                path = cached_download(f"{name}.tif", url)
                with rasterio.open(path) as source:
                    self.tiles[key] = (source.transform, source.read(1, masked=True).filled(np.nan))
            affine, array = self.tiles[key]
            mask = (tile_lon == x) & (tile_lat == y)
            cols, rows = ~affine * (lon[mask], lat[mask])
            rows = np.clip(np.floor(rows).astype(int), 0, array.shape[0] - 1)
            cols = np.clip(np.floor(cols).astype(int), 0, array.shape[1] - 1)
            heights[mask] = array[rows, cols]
        if not np.isfinite(heights).all():
            raise ValueError("DEM contains nodata on the rays; cannot claim complete horizon")
        return heights

    def ground(self, polygons: list[Any], inverse: Transformer) -> np.ndarray:
        """Low perimeter quantile is a DSM ground proxy, never a true bare-earth DTM."""
        samples = []
        for polygon in polygons:
            ring = polygon.buffer(35).boundary
            points = [
                ring.interpolate(fraction, normalized=True) for fraction in np.linspace(0, 1, 32)
            ]
            samples.append([(p.x, p.y) for p in points])
        xy = np.asarray(samples)
        lon, lat = inverse.transform(xy[..., 0], xy[..., 1])
        return np.quantile(self.sample(lon, lat), 0.2, axis=1)


def write_geojson(path: Path, geometry: Any) -> None:
    path.write_text(json.dumps(mapping(geometry)))


def read_geojson(path: Path) -> Any:
    return shape(json.loads(path.read_text()))
