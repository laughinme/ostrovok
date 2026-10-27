"""Sampling is stable and cannot associate a hotel with a courtyard or duplicate building."""

from pipeline import catalog


def building(osm_type, osm_id, **extra):
    return {"type": osm_type, "id": osm_id, "timestamp": "2026-10-27T00:00:00Z", **extra}


def test_catalog_uses_relation_footprint_and_skips_duplicates(monkeypatch):
    ring = [
        {"lon": x, "lat": y}
        for x, y in [(39.7, 43.6), (39.701, 43.6), (39.701, 43.601), (39.7, 43.601), (39.7, 43.6)]
    ]
    tags = {"building": "hotel", "building:levels": "4"}
    relation = building(
        "relation",
        99,
        tags=tags,
        members=[{"type": "way", "ref": 10, "role": "outer", "geometry": ring}],
    )
    member = building("way", 10, tags=tags, geometry=ring)
    hotel = building("node", 1, tags={"tourism": "hotel", "name": "Test"}, lon=39.7005, lat=43.6005)
    duplicate = {**hotel, "id": 2}
    monkeypatch.setattr(catalog, "DISTRICTS", {"center": ((39.6, 43.5, 39.8, 43.7), 1)})
    monkeypatch.setattr(
        catalog, "overpass", lambda _: {"elements": [duplicate, member, relation, hotel]}
    )
    monkeypatch.setattr(catalog, "write_csv", lambda *_args: None)
    monkeypatch.setattr(catalog, "write_json", lambda *_args: None)
    rows = catalog.select_hotels()
    assert len(rows) == 1
    assert rows[0]["osm_id"] == "node/1"
    assert rows[0]["building_osm_id"] == "relation/99"
    assert rows[0]["height_source"] == "osm_levels"
