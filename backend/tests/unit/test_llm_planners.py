"""The Liaison's LLM parser and the Curator's typed draft: the rules' fields, a safe fallback."""

import pytest
from pydantic import ValidationError

from app.domain.partner.answers import AnswerInput
from app.service.agents.curator import LlmDraft
from app.service.partner.llm_answers import LlmAnswerParser
from tests.factories import FakeLanguageModel

PETS = AnswerInput(
    "pets_policy",
    "Собак берём до тридцати пяти кило, доплата полторы тысячи за ночь",
    question="Можно ли с собакой 30 кг?",
)


async def test_free_text_becomes_the_rules_fields() -> None:
    llm = FakeLanguageModel(
        {
            "answer": {
                "clear": True,
                "allowed": True,
                "species": ["dog"],
                "max_weight_kg": 35,
                "fee_rub_per_night": 1500,
            }
        }
    )

    parsed = await LlmAnswerParser(llm).parse(PETS)

    assert parsed.parser == "llm"
    assert not parsed.needs_clarification
    assert parsed.fields["max_weight_kg"] == 35
    assert parsed.value["max_kg"] == 35
    assert parsed.value["fee_rub"] == 1500


async def test_vague_answer_asks_again() -> None:
    llm = FakeLanguageModel({"answer": {"clear": False, "allowed": True, "species": ["dog"]}})

    parsed = await LlmAnswerParser(llm).parse(PETS)

    assert parsed.needs_clarification


async def test_pets_without_a_weight_limit_is_not_certain() -> None:
    llm = FakeLanguageModel({"answer": {"clear": True, "allowed": True, "species": ["dog"]}})

    parsed = await LlmAnswerParser(llm).parse(PETS)

    assert parsed.needs_clarification


async def test_facade_answer_sets_the_scope() -> None:
    llm = FakeLanguageModel(
        {
            "answer": {
                "clear": True,
                "facade": "SW",
                "room_types": ["Делюкс"],
                "floor_from": 4,
                "floor_to": 8,
            }
        }
    )
    answer = AnswerInput("facade_rooms", "На юго-запад — Делюкс, с 4 по 8 этаж")

    parsed = await LlmAnswerParser(llm).parse(answer)

    assert parsed.fields["floor_from"] == 4
    assert parsed.scope.room_types == frozenset({"Делюкс"})
    assert not parsed.needs_clarification


async def test_provider_down_falls_back_to_rules() -> None:
    parsed = await LlmAnswerParser(FakeLanguageModel(down=True)).parse(PETS)

    assert parsed.parser == "rules"


async def test_forms_never_reach_the_llm() -> None:
    llm = FakeLanguageModel()
    form = AnswerInput("pets_policy", payload={"value": {"allowed": False}}, value_type="record")

    await LlmAnswerParser(llm).parse(form)

    assert llm.calls == []


def test_curator_draft_recipe_is_typed() -> None:
    draft = LlmDraft.model_validate(
        {
            "decision": "compute",
            "key": "pharmacy_500m",
            "title": "Аптека в 500 м",
            "recipe": {
                "kind": "poi_nearby",
                "poi": {"tags": {"amenity": ["pharmacy"]}},
                "within_m": 500,
            },
        }
    )

    assert draft.recipe is not None
    assert draft.recipe.kind == "poi_nearby"


@pytest.mark.parametrize(
    "raw",
    [
        # both radii: the recipe's own validator rejects it, PydanticAI asks the model again
        {
            "decision": "compute",
            "key": "x",
            "title": "x",
            "recipe": {
                "kind": "poi_nearby",
                "poi": {"tags": {"amenity": ["pharmacy"]}},
                "within_m": 500,
                "within_minutes": 5,
            },
        },
        # asking the hotel needs the ask_hotelier recipe
        {
            "decision": "ask_hotelier",
            "key": "x",
            "title": "x",
            "recipe": {"kind": "view", "target": "sea"},
        },
        {"decision": "compute", "key": "x", "title": "x"},
    ],
)
def test_curator_draft_rejects_inconsistent_plans(raw: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        LlmDraft.model_validate(raw)
