"""Contracted OSM filters, provenance and stable WGS84 exports; no network."""

import json

import pytest
from shapely import LineString, Point, box, from_wkb

osm = pytest.importorskip("pipeline.osm", exc_type=ImportError)
storage = pytest.importorskip("pipeline.storage", exc_type=ImportError)


def test_export_applies_metric_buffers_and_preserves_tags(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "REGION", tmp_path)
    storage.write_csv("hotels.csv.gz", ["lon", "lat"], [{"lon": 39.7, "lat": 43.6}])

    def record(ref, tags, shape):
        return {"osm_id": ref, "tags": tags, "geometry": shape}

    road = LineString([(39.7, 43.6), (39.7001, 43.6002), (39.7003, 43.6003)])
    records = [
        record("way/1", {"building": "hotel", "height": "18 m"}, box(39.7, 43.6, 39.7001, 43.6001)),
        record(
            "way/2",
            {"building": "yes", "building:levels": "4"},
            box(39.7002, 43.6, 39.7003, 43.6001),
        ),
        record("way/3", {"building": "yes"}, box(39.7004, 43.6, 39.7005, 43.6001)),
        record("way/4", {"building": "yes"}, box(39.9, 43.6, 39.9001, 43.6001)),
        record("way/5", {"highway": "footway", "surface": "paved"}, road),
        record("way/6", {"highway": "primary"}, LineString([(39.73, 43.6), (39.731, 43.6)])),
        record(
            "node/7",
            {"amenity": "cafe", "opening_hours": "24/7", "cuisine": "local"},
            Point(39.73, 43.6),
        ),
        record("node/8", {"natural": "peak", "ele": "2800"}, Point(40.9, 44.15)),
        record("node/9", {"natural": "peak"}, Point(40, 44)),
        record("way/10", {"natural": "beach"}, box(40, 43.3, 40.001, 43.301)),
        record("way/11", {"natural": "beach"}, box(41, 43.3, 41.001, 43.301)),
    ]
    osm.export(records)
    buildings = {r["osm_id"]: r for r in storage.read_csv("buildings.csv.gz")}
    assert set(buildings) == {"way/1", "way/2", "way/3"}
    assert [buildings[f"way/{i}"]["height_m"] for i in (1, 2, 3)] == ["18.0", "12", "9.0"]
    assert buildings["way/2"]["height_source"] == "osm_levels"
    features = {r["osm_id"]: r for r in storage.read_csv("osm_features.csv.gz")}
    assert set(features) == {"way/5", "node/7", "node/8", "way/10"}
    assert json.loads(features["node/7"]["tags"])["cuisine"] == "local"
    assert from_wkb(features["way/5"]["wkb"]).equals_exact(road, 0)
    first = (tmp_path / "osm_features.csv.gz").read_bytes()
    osm.export(list(reversed(records)))
    assert (tmp_path / "osm_features.csv.gz").read_bytes() == first
