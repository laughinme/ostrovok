from datetime import date
from pathlib import Path

from app.db.database import Database
from app.service.knowledge.registry import RegistryLoader
from app.service.search.intents import IntentParser
from tests.factories import FakeLanguageModel

DATA = Path(__file__).resolve().parents[2] / "data"
LLM_ANSWER = {
    "chips": [
        {"characteristic": "night_noise", "label": "Тишина ночью", "importance": "must"},
        {
            "characteristic": "khinkali",
            "label": "Хинкальная рядом",
            "params": {"maxWalkMinutes": 10},
        },
    ],
    "trip": {"from": "2026-11-12", "to": "2026-11-15", "adults": 2, "area": "center"},
    "hints": [],
}


async def _registry(db: Database) -> None:
    async with db.unit_of_work() as uow:
        await RegistryLoader().load(uow, DATA)


async def test_llm_planner_keeps_only_known_keys(db: Database) -> None:
    await _registry(db)
    async with db.unit_of_work() as uow:
        parser = IntentParser(uow, DATA, FakeLanguageModel({"intent": LLM_ANSWER}))
        intent = await parser.parse("тихо и хинкальная", today=date(2026, 10, 28))

    assert intent.planner == "llm"
    assert [c.characteristic for c in intent.chips] == ["night_noise", None]
    assert intent.trip.area == "center"


async def test_provider_down_falls_back_to_rules(db: Database) -> None:
    await _registry(db)
    async with db.unit_of_work() as uow:
        parser = IntentParser(uow, DATA, FakeLanguageModel(down=True))
        intent = await parser.parse("Обязательно тихо ночью", today=date(2026, 10, 28))

    assert intent.planner == "rules"
    assert intent.chips[0].characteristic == "night_noise"


async def test_typing_mode_never_calls_the_llm(db: Database) -> None:
    await _registry(db)
    llm = FakeLanguageModel({"intent": LLM_ANSWER})
    async with db.unit_of_work() as uow:
        intent = await IntentParser(uow, DATA, llm).parse(
            "Обязательно тихо ночью", today=date(2026, 10, 28), llm=False
        )

    assert intent.planner == "rules"
    assert llm.calls == []


async def test_invalid_llm_trip_falls_back_without_http_500(db: Database) -> None:
    await _registry(db)
    broken = {**LLM_ANSWER, "trip": {"adults": 100, "children": -1}}
    async with db.unit_of_work() as uow:
        intent = await IntentParser(uow, DATA, FakeLanguageModel({"intent": broken})).parse(
            "тихий номер вдвоём", today=date(2026, 10, 29)
        )
    assert intent.planner == "rules"
    assert intent.trip.adults == 2


async def test_rules_fill_trip_fields_missed_by_llm(db: Database) -> None:
    await _registry(db)
    missed = {**LLM_ANSWER, "trip": {}, "hints": ["Укажите даты заезда и выезда на выходные."]}
    async with db.unit_of_work() as uow:
        intent = await IntentParser(uow, DATA, FakeLanguageModel({"intent": missed})).parse(
            "на выходных вдвоём без детей", today=date(2026, 10, 29)
        )
    assert intent.planner == "llm"
    assert intent.trip.check_in == date(2026, 10, 31)
    assert intent.trip.check_out == date(2026, 11, 2)
    assert intent.trip.adults == 2
    assert intent.trip.children == 0
    assert not any(h.startswith("Укажите даты") for h in intent.hints)


async def test_explicit_llm_fields_win_over_rule_guesses(db: Database) -> None:
    await _registry(db)
    answer = {**LLM_ANSWER, "trip": {"adults": 2, "children": 3}}
    async with db.unit_of_work() as uow:
        intent = await IntentParser(uow, DATA, FakeLanguageModel({"intent": answer})).parse(
            "семья с детьми", today=date(2026, 10, 29)
        )
    assert intent.trip.children == 3
