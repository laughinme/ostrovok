from pathlib import Path

import yaml

from app.domain.knowledge.characteristic import Checkable
from app.service.search.moods import load_moods

DATA = Path(__file__).resolve().parents[3] / "data"


def test_saved_moods_only_use_registered_characteristics_and_known_checkability() -> None:
    raw = yaml.safe_load((DATA / "registry/characteristics.yaml").read_text())
    registered = {c["key"]: c for c in raw["characteristics"]}
    moods = load_moods(DATA)
    assert len(moods) == 8
    assert len({m.id for m in moods}) == len(moods)
    for mood in moods:
        assert mood.chips
        for chip in mood.chips:
            assert chip.characteristic in registered
            recipe = registered[chip.characteristic]["recipe"]
            expected = (
                Checkable.ASK_HOTELIER if recipe["kind"] == "ask_hotelier" else Checkable.COMPUTE
            )
            assert chip.checkable is expected


def test_missing_registry_has_no_saved_moods(tmp_path: Path) -> None:
    assert load_moods(tmp_path) == ()
