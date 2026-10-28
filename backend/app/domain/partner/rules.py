import math
import re
from typing import Any

from app.domain.knowledge.scope import Scope
from app.domain.partner.answer_text import (
    ambiguous,
    boolean,
    direction,
    floor_range,
    normalize,
    room_names,
)
from app.domain.partner.answers import AnswerInput, ParsedAnswer
from app.domain.partner.records import pet_record


def pets(text: str) -> dict[str, Any]:
    weight = re.search(
        r"(?:до|максимальный вес\w*(?: у нас)?|не более)\s*(\d+(?:[.,]\d+)?)\s*(?:кг|кило)", text
    )
    fee = re.search(r"(\d+)\s*(?:₽|рубл|руб\b)", text)
    denied = bool(re.search(r"нельзя|не принимаем|запрещен|без животных", text))
    return {
        "allowed": False
        if denied
        else True
        if re.search(r"можно|принимаем|разрешен|\bда\b", text)
        else None,
        "species": [kind for stem, kind in (("собак", "dog"), ("кош", "cat")) if stem in text],
        "max_weight_kg": float(weight[1].replace(",", ".")) if weight else None,
        "fee_rub_per_night": int(fee[1]) if fee else 0 if "бесплатно" in text else None,
    }


def _positive_clause(text: str) -> str:
    # A negative clause about Standard must not exclude blackout in Deluxe.
    return (
        re.split(r"а вот|в остальных|\. в номерах|\. в .{0,20}отдельных", text)[-1]
        if "а вот" in text
        else re.split(r"\. в номерах|\. в остальных|\. в «стандарт", text)[0]
    )


def _fields(answer: AnswerInput, text: str) -> dict[str, Any]:
    key = answer.characteristic
    facade = direction(text)
    rooms = room_names(
        _positive_clause(text) if key in {"blackout", "remote_work"} else text, answer.room_names
    )
    scoped: dict[str, Any] = {"facade": facade.value if facade else None, "room_types": rooms}
    if key == "facade_rooms":
        low, high = floor_range(text)
        return {**scoped, "floor_from": low, "floor_to": high}
    if key == "pets_policy":
        return pets(text)
    if key == "step_free":
        return {
            "elevator": bool(re.search(r"лифт", text)) if "лифт" in text else None,
            "step_free_entrance": boolean(text, key),
        }
    if key == "remote_work":
        speed = re.search(r"(\d+)\s*(?:мбит|мегабит)", text)
        return {
            "desk": True if "стол" in text else None,
            "wifi_mbps": int(speed[1]) if speed else None,
            "room_types": rooms,
        }
    field = "soundproof" if key == "soundproofing" else key
    value = boolean(_positive_clause(text) if key == "blackout" else text, key)
    return {**scoped, field: value}


def _value(answer: AnswerInput, fields: dict[str, Any]) -> Any:
    key = answer.characteristic
    if key == "pets_policy":
        allowed = fields.get("allowed")
        return {
            **fields,
            "kinds": fields.get("species", []),
            "max_kg": fields.get("max_weight_kg"),
            "fee_rub": fields.get("fee_rub_per_night"),
            "summary": "С животными" if allowed else "Без животных",
        }
    if key == "facade_rooms":
        return {**fields, "summary": "Категории номеров по сторонам здания"}
    field = {
        "soundproofing": "soundproof",
        "step_free": "step_free_entrance",
        "remote_work": "desk",
    }.get(key, key)
    return fields.get(field)


class RulesAnswerParser:
    async def parse(self, answer: AnswerInput) -> ParsedAnswer:
        if answer.payload:
            return self._structured(answer)
        text = normalize(answer.text)
        if answer.value_type in {"number", "category"}:
            return self._scalar(answer, text)
        fields = _fields(answer, text)
        value = _value(answer, fields)
        certain = value is not None and not ambiguous(text)
        if answer.characteristic == "facade_rooms":
            certain = certain and all(
                fields.get(k) for k in ("facade", "room_types", "floor_from", "floor_to")
            )
        confidence = 0.95 if certain else 0.35
        facade = direction(text)
        rooms = fields.get("room_types")
        scope = Scope(
            facades=frozenset({facade}) if facade else None,
            room_types=frozenset(rooms) if isinstance(rooms, list) and rooms else None,
        )
        return ParsedAnswer(fields, value, confidence, scope)

    def _structured(self, answer: AnswerInput) -> ParsedAnswer:
        payload = dict(answer.payload)
        if answer.characteristic == "facade_rooms":
            entries = payload.get("mappings")
            return ParsedAnswer(
                payload,
                {**payload, "summary": "Разметка категорий по фасадам"},
                1.0 if isinstance(entries, list) and entries else 0.0,
            )
        if "choice" in payload:
            value = payload["choice"]
            valid = isinstance(value, str) and value in answer.options
            if valid and answer.value_type == "probability":
                value = boolean(normalize(str(value)), answer.characteristic)
                valid = isinstance(value, bool)
        else:
            value = payload.get("value")
            valid = (
                isinstance(value, bool)
                if answer.value_type == "probability"
                else isinstance(value, int | float)
                and not isinstance(value, bool)
                and math.isfinite(value)
                if answer.value_type == "number"
                else isinstance(value, dict)
                if answer.value_type == "record"
                else isinstance(value, str) and value in answer.options
            )
        if answer.characteristic == "pets_policy" and isinstance(value, dict):
            value = pet_record(value)
            valid = value is not None
        return ParsedAnswer(payload, value, 1.0 if valid else 0.0)

    def _scalar(self, answer: AnswerInput, text: str) -> ParsedAnswer:
        if answer.value_type == "category":
            matches = [option for option in answer.options if normalize(option) == text.strip()]
            value: Any = matches[0] if len(matches) == 1 else None
        else:
            numbers = re.findall(r"(?<!\w)-?\d+(?:[.,]\d+)?", text)
            value = float(numbers[0].replace(",", ".")) if len(numbers) == 1 else None
        return ParsedAnswer(
            {"value": value}, value, 0.95 if value is not None and not ambiguous(text) else 0.35
        )
