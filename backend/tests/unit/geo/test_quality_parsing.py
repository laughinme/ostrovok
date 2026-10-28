from datetime import date
from pathlib import Path

import pytest

from app.domain.knowledge.characteristic import Checkable
from app.domain.knowledge.curation import PlaceTerm
from app.domain.partner.rules import RulesAnswerParser
from app.domain.search.intent import Chip, Importance, Intent
from app.domain.search.trip import TripDraft
from app.service.quality.parsing import answer_metrics, curator_metrics, intent_metrics, rules_plan

DATA = Path(__file__).resolve().parents[3] / "data"


async def test_intent_metrics_penalize_wrong_keys_and_null_trip_fields() -> None:
    async def parse(text: str) -> Intent:
        return Intent(
            text,
            (Chip("c1", "Море", Importance.NICE, Checkable.COMPUTE, "sea_view"),),
            TripDraft(check_in=date(2026, 11, 5), adults=2),
            (),
        )

    result = await intent_metrics(
        parse,
        [
            {
                "query": "тихо",
                "chips": [{"key": "night_noise"}],
                "trip": {"from": "2026-11-05", "adults": None},
            }
        ],
    )
    assert result["micro"]["f1"] == 0
    assert result["perKey"]["sea_view"]["fp"] == 1
    assert result["tripAccuracy"] == 0.5
    llm = await intent_metrics(parse, [{"query": "тихо"}], require_llm=True)
    assert llm["n"] == 0
    assert llm["rulesResults"] == 1
    assert llm["micro"]["f1"] is None


async def test_answer_dataset_measures_fields_and_clarifications() -> None:
    result = await answer_metrics(RulesAnswerParser(), DATA / "eval/hotelier_answers.yaml")
    assert result["total_fields"] == 72
    assert result["fieldAccuracy"] == 1
    assert result["total_ambiguous"] == 6
    assert result["clarificationAccuracy"] == 1


async def test_curator_metrics_compare_semantics_and_count_missing_params(tmp_path: Path) -> None:
    path = tmp_path / "curator.yaml"
    path.write_text("""
- description: Аптека в радиусе 500 метров
  expected_method: poi_nearby
  expected_params:
    poi: {amenity: pharmacy}
    within: {meters: 500}
    open: any
    min_count: 2
""")
    report = await curator_metrics(
        path, rules_plan([PlaceTerm("аптека", ({"amenity": ["pharmacy"]},))])
    )
    assert report["methodAccuracy"] == 1
    assert report["parameterAccuracy"] == pytest.approx(3 / 4)
