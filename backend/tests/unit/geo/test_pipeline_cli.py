from types import SimpleNamespace

from pipeline import __main__


def test_all_runs_download_and_clip_before_export_and_manifest(monkeypatch):
    called = []
    monkeypatch.setattr("sys.argv", ["pipeline", "all"])
    monkeypatch.setattr(
        __main__.importlib,
        "import_module",
        lambda name: SimpleNamespace(run=lambda: called.append(name)),
    )
    monkeypatch.setattr(__main__.manifest, "run", lambda: called.append("manifest"))
    __main__.main()
    assert called == [
        "pipeline.pbf",
        "pipeline.osm",
        "pipeline.dem",
        "pipeline.climate",
        "pipeline.hotels",
        "pipeline.graph",
        "pipeline.window_profiles",
        "manifest",
    ]
