import gzip

import pytest
from shapely import LineString, Point, box, from_wkb

sea = pytest.importorskip("pipeline.sea", exc_type=ImportError)


def test_closed_island_keeps_land_out_of_water(tmp_path, monkeypatch):
    monkeypatch.setattr(sea, "REGION", tmp_path)
    coast = LineString([(39.68, 44.3), (39.68, 42.8)])
    island = box(39.61, 43.49, 39.63, 43.51)
    sea.run([coast, island])
    mask = from_wkb(gzip.decompress((tmp_path / "sea.wkb.gz").read_bytes()).decode())
    assert mask.is_valid
    assert mask.contains(Point(39.6, 43.45))
    assert not mask.contains(Point(39.62, 43.5))
    first = (tmp_path / "sea.wkb.gz").read_bytes()
    sea.run([coast, island])
    assert (tmp_path / "sea.wkb.gz").read_bytes() == first


def test_incomplete_coast_does_not_publish_false_mask(tmp_path, monkeypatch):
    monkeypatch.setattr(sea, "REGION", tmp_path)
    with pytest.raises(ValueError, match="valid Black Sea"):
        sea.run([LineString([(39.68, 43.8), (39.68, 43.4)])])
    assert not (tmp_path / "sea.wkb.gz").exists()
