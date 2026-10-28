from collections.abc import Mapping, Sequence
from dataclasses import dataclass, replace
from typing import Any

from app.domain.knowledge.characteristic import Checkable
from app.domain.search.intent import WEIGHTS, Chip, Importance, Intent


@dataclass(frozen=True, slots=True)
class TasteEvent:
    kind: str
    payload: Mapping[str, Any]


@dataclass(frozen=True, slots=True)
class TasteWeight:
    characteristic: str
    weight: float
    because: str
    value: bool = True


@dataclass(frozen=True, slots=True)
class TasteProfile:
    enabled: bool
    summary: tuple[str, ...]
    weights: tuple[TasteWeight, ...]


def infer_taste(events: Sequence[TasteEvent]) -> dict[str, TasteWeight]:
    result: dict[str, TasteWeight] = {}
    bookings = [e for e in events if e.kind == "booking"]
    quiet = sum("тих" in str(e.payload.get("request", "")).lower() for e in bookings)
    if quiet:
        result["night_noise"] = TasteWeight(
            "night_noise",
            3.0,
            f"В {quiet} из {len(bookings)} прошлых броней просили тихий номер (демо)",
        )
    for event in events:
        p = event.payload
        key = p.get("characteristic")
        if not isinstance(key, str) or event.kind not in {"chip_edit", "rejected_hotel"}:
            continue
        weight = WEIGHTS[Importance(p.get("to", "important"))]
        previous = result.get(key)
        reasons = [previous.because] if previous else []
        reasons.append(str(p.get("reason", "Вы изменили важность желания")))
        result[key] = TasteWeight(
            key,
            weight,
            "; ".join(dict.fromkeys(reasons)),
            p.get("value", key != "steep_streets") is not False,
        )
    return result


def taste_summary(weights: Sequence[TasteWeight]) -> tuple[str, ...]:
    by_key = {w.characteristic: w for w in weights}
    summary = []
    quiet, sea = by_key.get("night_noise"), by_key.get("sea_view")
    if quiet and sea and quiet.weight > sea.weight:
        summary.append("Тишина важнее вида")
    flat = by_key.get("steep_streets")
    if flat and not flat.value and flat.weight > 0:
        summary.append("Не любит подъёмы")
    return tuple(summary)


def apply_taste(
    intent: Intent, profile: TasteProfile, titles: Mapping[str, tuple[str, Checkable]]
) -> Intent:
    explicit = tuple(c for c in intent.chips if not c.from_profile)
    if not profile.enabled:
        return replace(intent, chips=explicit)
    keys = {c.characteristic for c in explicit}
    chips = list(explicit)
    for w in profile.weights:
        if w.weight <= 0 or w.characteristic in keys or w.characteristic not in titles:
            continue
        title, checkable = titles[w.characteristic]
        importance = (
            Importance.MUST
            if w.weight >= 3
            else (Importance.IMPORTANT if w.weight >= 2 else Importance.NICE)
        )
        chips.append(
            Chip(
                id=f"profile:{w.characteristic}",
                label=title,
                importance=importance,
                checkable=checkable,
                characteristic=w.characteristic,
                from_profile=True,
                params={"profileWeight": w.weight, "value": w.value},
            )
        )
    return replace(intent, chips=tuple(chips))
