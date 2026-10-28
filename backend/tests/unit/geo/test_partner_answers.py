from pathlib import Path

import pytest
import yaml

from app.domain.partner.answers import AnswerInput
from app.domain.partner.questions import question_value
from app.domain.partner.rules import RulesAnswerParser

DATA = Path(__file__).resolve().parents[3] / "data/eval/hotelier_answers.yaml"


def test_question_priority_peaks_at_uncertainty() -> None:
    assert question_value(34, None, 0.5) == 17
    assert question_value(34, 0.5, 0.5) == 17
    assert question_value(34, 1, 0.5) == 0
    assert question_value(34, 0, 0.5) == 0


@pytest.mark.parametrize("case", yaml.safe_load(DATA.read_text()))
async def test_r3_clarity_gate(case: dict[str, object]) -> None:
    parsed = await RulesAnswerParser().parse(
        AnswerInput(str(case["question_key"]), str(case["answer_text"]))
    )
    assert parsed.needs_clarification == (case["clarity"] == "low")


async def test_pet_weight_limit_is_not_the_guest_weight() -> None:
    result = await RulesAnswerParser().parse(
        AnswerInput(
            "pets_policy", "Да, с собакой 30 кг можно. Принимаем до 35 кг, доплата 1500 ₽ за ночь."
        )
    )
    assert result.value["max_kg"] == 35
    assert result.value["fee_rub"] == 1500
    assert result.value["kinds"] == ["dog"]


async def test_text_does_not_invent_a_seaward_compass_direction() -> None:
    result = await RulesAnswerParser().parse(
        AnswerInput("facade_rooms", "Номера Комфорт выходят на море, с 4 по 8 этаж.")
    )
    assert result.needs_clarification
    assert result.fields["facade"] is None


async def test_invalid_boolean_form_needs_clarification() -> None:
    result = await RulesAnswerParser().parse(AnswerInput("blackout", payload={"value": "yes"}))
    assert result.needs_clarification
