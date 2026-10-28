from pathlib import Path
from uuid import uuid4

import yaml

from app.db.models import FactRow, Hotel
from pipeline.quality_search import _judge, _satisfies

DATA = Path(__file__).resolve().parents[3] / "data/eval/search_queries.yaml"


def test_search_snapshot_has_twenty_unique_r2_queries_and_traceable_facts() -> None:
    dataset = yaml.safe_load(DATA.read_text())
    assert len(dataset["queries"]) == 20
    assert len({c["id"] for c in dataset["queries"]}) == 20
    assert dataset["methodology"]["independent_gold"] is False
    for case in dataset["queries"]:
        assert len({j["osm_id"] for j in case["judgments"]}) == len(case["judgments"])
        for judgment in case["judgments"]:
            assert judgment["grade"] in range(4)
            for check in judgment["checks"]:
                if check["satisfied"]:
                    assert check["fact_id"] in dataset["evidence"]


def test_rubric_respects_negative_street_constraint() -> None:
    fact = FactRow(characteristic="steep_streets", value=False, confidence=0.9)
    assert _satisfies(fact, {"key": "steep_streets", "params": {"avoid": True}})
    assert not _satisfies(fact, {"key": "steep_streets", "params": {}})


def test_rubric_does_not_join_incompatible_facades() -> None:
    hotel = Hotel(osm_id="way/1", floors=2)
    facts = [
        FactRow(
            id=uuid4(), characteristic=key, scope={"facades": [side]}, value=True, confidence=0.9
        )
        for key, side in (("sea_view", "SW"), ("night_noise", "NE"))
    ]
    case = {"trip": {}, "chips": [{"key": k, "params": {}} for k in ("sea_view", "night_noise")]}
    assert _judge(hotel, facts, case)["grade"] == 2
