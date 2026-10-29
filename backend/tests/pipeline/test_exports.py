import gzip

from shapely import Point, from_wkb

from pipeline import sea, storage


def test_csv_is_utf8_and_byte_reproducible(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "REGION", tmp_path)
    rows = [{"osm_id": "node/1", "name": "Отель, О!кно", "stars": ""}]
    storage.write_csv("sample.csv.gz", list(rows[0]), rows)
    first = (tmp_path / "sample.csv.gz").read_bytes()
    storage.write_csv("sample.csv.gz", list(rows[0]), rows)
    assert (tmp_path / "sample.csv.gz").read_bytes() == first
    assert storage.read_csv("sample.csv.gz") == rows


def test_coastline_keeps_water_right_and_land_out(tmp_path, monkeypatch):
    monkeypatch.setattr(sea, "REGION", tmp_path)
    monkeypatch.setattr(
        sea,
        "overpass",
        lambda _, **_kwargs: {
            "elements": [
                {
                    "geometry": [
                        {"lon": 39.68, "lat": 44.3},
                        {"lon": 39.68, "lat": 42.8},
                    ]
                }
            ]
        },
    )
    sea.run()
    shape = from_wkb(gzip.decompress((tmp_path / "sea.wkb.gz").read_bytes()).decode("ascii"))
    assert shape.geom_type == "MultiPolygon"
    assert shape.is_valid
    assert shape.contains(Point(39.6, 43.45))
    assert not shape.contains(Point(39.73, 43.61))
