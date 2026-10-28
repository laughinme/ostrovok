import csv
import gzip
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGION = ROOT / 'backend/data/region'
RADIUS = 140


def geometry(raw):
    data = bytes.fromhex(raw) if isinstance(raw, str) else raw
    offset = 0

    def read():
        nonlocal offset
        endian = '<' if data[offset] == 1 else '>'
        offset += 1
        kind = struct.unpack_from(endian + 'I', data, offset)[0]
        offset += 4

        def integer():
            nonlocal offset
            value = struct.unpack_from(endian + 'I', data, offset)[0]
            offset += 4
            return value

        def point():
            nonlocal offset
            value = struct.unpack_from(endian + 'dd', data, offset)
            offset += 16
            return value

        if kind == 1:
            return 'point', [point()]
        if kind == 2:
            return 'line', [point() for _ in range(integer())]
        if kind == 3:
            rings = [[point() for _ in range(integer())] for _ in range(integer())]
            return 'polygon', rings[0] if rings else []
        if kind in (4, 5, 6, 7):
            return 'multi', [read() for _ in range(integer())]
        raise ValueError(kind)

    return read()


def parts(item, kind):
    if item[0] == kind:
        return [item[1]]
    if item[0] == 'multi':
        return [part for child in item[1] for part in parts(child, kind)]
    return []


def bounds(points):
    return min(x for x, _ in points), min(y for _, y in points), max(x for x, _ in points), max(y for _, y in points)


def clipped(points, radius=RADIUS):
    result = points
    for axis, boundary, greater in [(0, -radius, True), (0, radius, False), (1, -radius, True), (1, radius, False)]:
        source, result = result, []
        if not source:
            break
        for a, b in zip(source, source[1:] + source[:1]):
            inside_a = a[axis] >= boundary if greater else a[axis] <= boundary
            inside_b = b[axis] >= boundary if greater else b[axis] <= boundary
            if inside_a:
                result.append(a)
            if inside_a != inside_b:
                t = (boundary - a[axis]) / (b[axis] - a[axis])
                result.append(tuple(a[i] + t * (b[i] - a[i]) for i in range(2)))
    return [[round(x, 1), round(y, 1)] for x, y in result]


buildings = []
with gzip.open(REGION / 'buildings.csv.gz', 'rt') as file:
    for row in csv.DictReader(file):
        for polygon in parts(geometry(row['wkb']), 'polygon'):
            buildings.append((row, polygon, bounds(polygon)))
roads = []
with gzip.open(REGION / 'osm_features.csv.gz', 'rt') as file:
    for row in csv.DictReader(file):
        if row['kind'] != 'road':
            continue
        for line in parts(geometry(row['wkb']), 'line'):
            roads.append((line, bounds(line)))
with gzip.open(REGION / 'sea.wkb.gz', 'rb') as file:
    sea = parts(geometry(file.read().decode().strip()), 'polygon')
contexts = {}
with gzip.open(REGION / 'hotels.csv.gz', 'rt') as file:
    for hotel in csv.DictReader(file):
        lon, lat = float(hotel['lon']), float(hotel['lat'])
        sx, sy = math.cos(math.radians(lat)) * 111320, 111320
        west, east = lon - RADIUS / sx, lon + RADIUS / sx
        south, north = lat - RADIUS / sy, lat + RADIUS / sy

        def nearby(box):
            return box[0] < east and box[2] > west and box[1] < north and box[3] > south

        def local(points):
            return [((x - lon) * sx, -(y - lat) * sy) for x, y in points]

        candidates = [(row, local(polygon)) for row, polygon, box in buildings if nearby(box)]
        candidates.sort(key=lambda item: min(x * x + z * z for x, z in item[1]))
        blocks = []
        for row, points in candidates[:48]:
            polygon = clipped(points)
            if len(polygon) < 3:
                continue
            blocks.append({'id': row['osm_id'], 'points': polygon, 'height': round(float(row['height_m']), 1), 'estimated': row['height_source'] == 'default', 'hotel': row['osm_id'] == hotel['building_osm_id']})
        if not any(block['hotel'] for block in blocks) and hotel['footprint_wkb']:
            for polygon in parts(geometry(hotel['footprint_wkb']), 'polygon'):
                blocks.append({'id': hotel['osm_id'], 'points': clipped(local(polygon)), 'height': round(float(hotel['height_m']), 1), 'estimated': hotel['height_source'] == 'default', 'hotel': True})
        water = [polygon for source in sea if nearby(bounds(source)) for polygon in [clipped(local(source))] if len(polygon) >= 3]
        paths = []
        for line, box in roads:
            if nearby(box):
                points = [[round(x, 1), round(z, 1)] for x, z in local(line) if abs(x) <= RADIUS and abs(z) <= RADIUS]
                if len(points) > 1:
                    paths.append(points)
        contexts[hotel['osm_id']] = {'radius': RADIUS, 'buildings': blocks, 'roads': paths[:45], 'water': water}
output = ROOT / 'frontend/public/data/window-contexts.json'
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps({'version': 1, 'attribution': '© OpenStreetMap contributors, ODbL 1.0 · снимок 27.10.2026', 'hotels': contexts}, ensure_ascii=False, separators=(',', ':')))
print(f'{len(contexts)} contexts, {output.stat().st_size:,} bytes')
print('Cascade', [(k, len(v['buildings']), len(v['water'])) for k, v in contexts.items() if any(b['hotel'] and len(b['points']) > 0 for b in v['buildings'])][:3])
