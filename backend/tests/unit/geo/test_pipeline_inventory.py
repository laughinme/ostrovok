import json

import numpy as np
import pytest

from pipeline import inventory, manifest, storage


@pytest.mark.parametrize(
    ("sizes", "valid"),
    [
        ([49_999_999], True),
        ([50_000_000], False),
        ([30_000_000, 29_999_999], True),
        ([30_000_000, 30_000_000], False),
    ],
)
def test_budget_boundaries_are_decimal_and_strict(tmp_path, sizes, valid):
    for index, size in enumerate(sizes):
        with (tmp_path / f"artifact-{index}").open("wb") as stream:
            stream.truncate(size)
    (tmp_path / "MANIFEST.md").write_text("Previous report is excluded from the inventory")
    if valid:
        paths, total = inventory.size_inventory(tmp_path)
        assert total == sum(sizes)
        assert len(paths) == len(sizes)
    else:
        with pytest.raises(ValueError, match="budget exceeded"):
            inventory.size_inventory(tmp_path)


def test_manifest_records_snapshot_checksum_counts_and_runtime_sizes(tmp_path, monkeypatch):
    data = tmp_path / "data"
    region = data / "region"
    osm_cache = tmp_path / ".cache" / "osm"
    osm_cache.mkdir(parents=True)
    monkeypatch.setattr(storage, "REGION", region)
    monkeypatch.setattr(manifest, "DATA", data)
    monkeypatch.setattr(inventory, "ROOT", tmp_path)
    monkeypatch.setattr(inventory, "CACHE", tmp_path / ".cache" / "pipeline")
    source = {
        "url": "https://download.geofabrik.de/russia/example.osm.pbf",
        "bytes": 500_000_000,
        "md5": "a" * 32,
    }
    (osm_cache / "example.source.json").write_text(json.dumps(source))
    storage.write_csv("hotels.csv.gz", ["district"], [{"district": "center"}])
    storage.write_csv("osm_features.csv.gz", ["kind"], [{"kind": "beach"}, {"kind": "road"}])
    np.savez_compressed(region / "walk_graph.npz", nodes=np.zeros((3, 3)), edges=np.zeros((4, 2)))
    manifest.run()
    text = (data / "MANIFEST.md").read_text()
    assert "500,000,000 байт в сыром PBF" in text
    assert "MD5 `" + "a" * 32 + "`" in text
    assert "example.osm.pbf](https://download.geofabrik.de/russia/example.osm.pbf)" in text
    assert "3 узлов, 4 направленных рёбер" in text
    assert "'beach': 1, 'road': 1" in text
    assert "region/walk_graph.npz" in text
    assert "ODbL 1.0" in text
    assert "60,000,000 байт" in text
