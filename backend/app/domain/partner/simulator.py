from collections.abc import Mapping
from dataclasses import dataclass, field
from hashlib import sha256
from typing import Any


@dataclass(frozen=True, slots=True)
class SimulatedAnswer:
    text: str
    payload: Mapping[str, Any] = field(default_factory=dict)


def demo_delay(key: str, bounds: tuple[float, float]) -> float:
    low, high = bounds
    if not 0 <= low <= high:
        raise ValueError("Invalid simulator delay range")
    fraction = int.from_bytes(sha256(key.encode()).digest()[:4]) / (2**32 - 1)
    return low + (high - low) * fraction


def simulate_answer(
    profile: Mapping[str, Any], key: str, *, question_id: str, clarification: bool = False
) -> SimulatedAnswer | None:
    persona = profile.get("persona", "краткий")
    vague = int.from_bytes(sha256(question_id.encode()).digest()[:2]) % 3 == 0
    if persona == "расплывчатый" and not clarification and vague:
        return SimulatedAnswer("Кажется, да, но точные условия лучше уточнить у администратора.")
    if key == "facade_rooms":
        marks = [
            {
                "roomTypeId": m["room_type_id"],
                "facade": m["facade"],
                "floorFrom": m["floor_from"],
                "floorTo": m["floor_to"],
            }
            for m in profile.get("facade_rooms", [])
        ]
        return SimulatedAnswer("Категории и этажи отмечены в форме.", {"mappings": marks})
    if key == "sea_view" and profile.get("claims", {}).get("sea_view_all_rooms"):
        return SimulatedAnswer("Да, у нас все номера с видом на море!")
    value = profile.get(key)
    if key == "pets_policy" and isinstance(value, Mapping):
        return SimulatedAnswer(_pets(value))
    if isinstance(value, bool):
        text = "Да" if value else "Нет"
        if persona == "многословный":
            text += ", подтверждаем оснащение и правила нашего отеля. Обращайтесь, поможем!"
        return SimulatedAnswer(text)
    return None


def _pets(policy: Mapping[str, Any]) -> str:
    if not policy.get("allowed"):
        return "Нет, животных не принимаем."
    kinds = " и ".join({"dog": "собак", "cat": "кошек"}.get(k, k) for k in policy.get("kinds", []))
    weight = policy.get("max_kg")
    limit = f"до {weight} кг" if weight is not None else "без ограничений по весу"
    return f"Да, принимаем {kinds} {limit}. Доплата {policy.get('fee_rub', 0)} ₽ за ночь."
