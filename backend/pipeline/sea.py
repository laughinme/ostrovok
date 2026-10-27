"""Build a sea mask from directed OSM coastlines (land on the left)."""

import gzip

from shapely import Point, box, union_all
from shapely.ops import polygonize, unary_union

from pipeline.geography import REGION_BOUNDS, line, metric, polygons, wgs84
from pipeline.storage import REGION, overpass


def run() -> None:
    west, south, east, north = REGION_BOUNDS
    elements = overpass(f'way["natural"="coastline"]({south},{west},{north},{east})')["elements"]
    bounds = metric(box(*REGION_BOUNDS))
    lines, probes = [], []
    for element in elements:
        shape = metric(line(element["geometry"]))
        lines.append(shape.intersection(bounds))
        coords = list(shape.coords)
        for index in range(0, len(coords) - 1, 10):
            x, y = coords[index]
            xx, yy = coords[index + 1]
            dx, dy = xx - x, yy - y
            length = (dx * dx + dy * dy) ** 0.5
            if length > 1:
                probes.append(Point((x + xx) / 2 + dy / length * 2, (y + yy) / 2 - dx / length * 2))
    faces = list(polygonize(union_all([bounds.boundary, *lines], grid_size=0.001)))
    sea = polygons(wgs84(unary_union([f for f in faces if any(f.contains(p) for p in probes)])))
    if len(faces) < 2 or sea.is_empty or not sea.contains(Point(39.6, 43.45)):
        raise ValueError("Coastlines did not produce a valid Black Sea mask")
    if sea.contains(Point(39.73, 43.61)):
        raise ValueError("Sea mask contains central Sochi land")
    with gzip.GzipFile(filename=str(REGION / "sea.wkb.gz"), mode="wb", mtime=0) as stream:
        stream.write(sea.wkb_hex.encode("ascii"))
    print(f"Sea mask: {len(sea.geoms)} polygons", flush=True)
