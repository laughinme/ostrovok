from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.domain.knowledge.scope import Facade, Scope
from app.domain.partner.answers import AnswerInput, ParsedAnswer
from app.domain.partner.rules import RulesAnswerParser, answer_value
from app.service.ports import LanguageModel, LlmUnavailableError

CERTAIN, UNSURE = 0.9, 0.35

PROMPT = Path(__file__).resolve().parents[1] / "agents" / "prompts" / "answer.md"

FacadeCode = Literal["N", "NE", "E", "SE", "S", "SW", "W", "NW"]


class LlmAnswer(BaseModel):
    clear: bool
    value: bool | None = None
    facade: FacadeCode | None = None
    outlook: Literal["sea", "courtyard", "mountains", "street"] | None = None
    room_types: list[str] = Field(default_factory=list)
    floor_from: int | None = Field(None, ge=-2, le=60)
    floor_to: int | None = Field(None, ge=-2, le=60)
    allowed: bool | None = None
    species: list[Literal["dog", "cat"]] = Field(default_factory=list)
    max_weight_kg: float | None = Field(None, gt=0, le=200)
    no_weight_limit: bool = False
    fee_rub_per_night: int | None = Field(None, ge=0)
    conditions: str | None = None
    elevator: bool | None = None
    step_free_entrance: bool | None = None
    desk: bool | None = None
    wifi_mbps: int | None = Field(None, ge=0)
    number: float | None = None
    option: str | None = None


_FIELDS = {
    "facade_rooms": "facade, room_types, floor_from, floor_to, outlook",
    "pets_policy": (
        "allowed, species, max_weight_kg, no_weight_limit, fee_rub_per_night, conditions"
    ),
    "step_free": "elevator, step_free_entrance",
    "remote_work": "desk, wifi_mbps, room_types",
}


def _prompt(answer: AnswerInput) -> str:
    fields = _FIELDS.get(answer.characteristic, "value, facade, room_types, outlook")
    if answer.value_type == "number":
        fields = f"number (в {answer.unit or 'единицах вопроса'})"
    elif answer.value_type == "category":
        fields = f"option — одно из: {', '.join(answer.options)}"
    rooms = ", ".join(answer.room_names) or "неизвестны"
    return (
        f"Характеристика: {answer.characteristic}\nВопрос отелю: {answer.question or '—'}\n"
        f"Категории номеров отеля: {rooms}\nКакие поля заполнить: {fields}, clear\n\n"
        f"Ответ отельера:\n{answer.text}"
    )


def _room(name: str) -> str:
    name = " ".join(name.split())
    return name[:1].upper() + name[1:]


def _fields(key: str, out: LlmAnswer) -> dict[str, Any]:
    out = out.model_copy(update={"room_types": [_room(r) for r in out.room_types]})
    scoped: dict[str, Any] = {"facade": out.facade, "room_types": out.room_types}
    if out.outlook:
        scoped["outlook"] = out.outlook
    if key == "facade_rooms":
        return {**scoped, "floor_from": out.floor_from, "floor_to": out.floor_to}
    if key == "pets_policy":
        fields: dict[str, Any] = {
            "allowed": out.allowed,
            "species": out.species,
            "max_weight_kg": out.max_weight_kg,
            "fee_rub_per_night": out.fee_rub_per_night,
        }
        return {**fields, "conditions": out.conditions} if out.conditions else fields
    if key == "step_free":
        return {"elevator": out.elevator, "step_free_entrance": out.step_free_entrance}
    if key == "remote_work":
        return {"desk": out.desk, "wifi_mbps": out.wifi_mbps, "room_types": out.room_types}
    return {**scoped, "soundproof" if key == "soundproofing" else key: out.value}


def _certain(key: str, out: LlmAnswer, fields: dict[str, Any], value: Any) -> bool:
    if not out.clear or value is None:
        return False
    if key == "facade_rooms":
        return all(fields.get(k) for k in ("facade", "room_types", "floor_from", "floor_to"))
    if key == "pets_policy" and out.allowed:
        return bool(out.species) and (out.max_weight_kg is not None or out.no_weight_limit)
    return True


def answer_parser(llm: LanguageModel | None) -> "LlmAnswerParser | None":
    return LlmAnswerParser(llm) if llm is not None else None


class LlmAnswerParser:
    def __init__(self, llm: LanguageModel) -> None:
        self._llm = llm
        self._rules = RulesAnswerParser()

    async def parse(self, answer: AnswerInput) -> ParsedAnswer:
        if answer.payload or not answer.text.strip() or not self._llm.available:
            return await self._rules.parse(answer)
        try:
            result = await self._llm.structured(
                task="answer",
                system=PROMPT.read_text(encoding="utf-8"),
                prompt=_prompt(answer),
                output=LlmAnswer,
            )
        except LlmUnavailableError:
            return await self._rules.parse(answer)
        out = result.output
        if answer.value_type in {"number", "category"}:
            value: Any = out.number if answer.value_type == "number" else out.option
            if answer.value_type == "category" and value not in answer.options:
                value = None
            confidence = CERTAIN if out.clear and value is not None else UNSURE
            return ParsedAnswer({"value": value}, value, confidence, parser="llm")
        fields = _fields(answer.characteristic, out)
        value = answer_value(answer, fields)
        confidence = CERTAIN if _certain(answer.characteristic, out, fields, value) else UNSURE
        scope = Scope(
            facades=frozenset({Facade(out.facade)}) if out.facade else None,
            room_types=frozenset(rooms) if (rooms := fields.get("room_types")) else None,
        )
        return ParsedAnswer(fields, value, confidence, scope, parser="llm")
