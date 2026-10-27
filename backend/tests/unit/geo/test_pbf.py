"""Offline GDAL integration: native OSM IDs, complete tags and cached geometry."""

import json

import httpx
import pytest

pbf = pytest.importorskip("pipeline.pbf", exc_type=ImportError)


def test_osm_cache_preserves_ways_relations_and_all_tags(tmp_path, monkeypatch):
    pytest.importorskip("pyogrio")
    source = tmp_path / "scene.osm"
    source.write_text("""<?xml version="1.0" encoding="UTF-8"?>
<osm version="0.6" generator="unit-test">
<node id="1" lat="43.6" lon="39.7"><tag k="natural" v="peak"/>
<tag k="ele" v="660"/><tag k="source" v="survey"/><tag k="name" v="Ахун"/></node>
<node id="2" lat="43.6001" lon="39.7"/>
<node id="3" lat="43.6001" lon="39.7001"/>
<node id="4" lat="43.6" lon="39.7001"/>
<node id="5" lat="43.6002" lon="39.7001"/>
<way id="10"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/>
<tag k="building" v="hotel"/><tag k="height" v="18"/></way>
<way id="11"><nd ref="3"/><nd ref="5"/><tag k="highway" v="steps"/>
<tag k="step_count" v="17"/><tag k="foot" v="yes"/></way>
<way id="12"><nd ref="1"/><nd ref="2"/><nd ref="5"/><nd ref="1"/></way>
<relation id="20"><member type="way" ref="12" role="outer"/>
<tag k="type" v="multipolygon"/><tag k="leisure" v="park"/></relation>
</osm>""")
    monkeypatch.setattr(pbf, "OSM_CACHE", tmp_path)
    cache = pbf.regional_cache(source)
    points = pbf.records(cache, "points")
    assert points[0]["osm_id"] == "node/1"
    assert points[0]["tags"] == {
        "natural": "peak",
        "ele": "660",
        "source": "survey",
        "name": "Ахун",
    }
    lines = pbf.records(cache, "lines")
    assert lines[0]["osm_id"] == "way/11"
    assert lines[0]["tags"]["step_count"] == "17"
    polygons = {r["osm_id"]: r for r in pbf.records(cache, "multipolygons")}
    assert set(polygons) == {"way/10", "relation/20"}
    assert polygons["way/10"]["geometry"].is_valid
    assert polygons["relation/20"]["tags"]["leisure"] == "park"
    monkeypatch.setattr(
        pbf.pyogrio, "read_dataframe", lambda *_args, **_kwargs: pytest.fail("cache miss")
    )
    assert pbf.regional_cache(source) == cache


def test_snapshot_rejects_partial_existing_file(tmp_path, monkeypatch):
    monkeypatch.setattr(pbf, "OSM_CACHE", tmp_path)
    (tmp_path / pbf.SNAPSHOT).write_bytes(b"partial")
    monkeypatch.setattr(
        httpx.Client,
        "get",
        lambda *_args, **_kwargs: httpx.Response(
            200, text="a" * 32 + "  snapshot.pbf", request=httpx.Request("GET", pbf.SOURCE)
        ),
    )
    with pytest.raises(ValueError, match="Incomplete OSM"):
        pbf.snapshot()
    assert not (tmp_path / pbf.SNAPSHOT).with_suffix(".source.json").exists()


def test_verified_snapshot_is_usable_offline(tmp_path, monkeypatch):
    monkeypatch.setattr(pbf, "OSM_CACHE", tmp_path)
    source = tmp_path / pbf.SNAPSHOT
    source.write_bytes(b"verified-test-data")
    source.with_suffix(".source.json").write_text(
        json.dumps(
            {
                "md5": pbf.checksum(source),
                "bytes": source.stat().st_size,
            }
        )
    )
    assert pbf.snapshot() == source
