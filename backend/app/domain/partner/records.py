import math
from collections.abc import Mapping
from typing import Any


def pet_record(value: Mapping[str, Any]) -> dict[str, Any] | None:
    allowed = value.get("allowed")
    kinds = value.get("kinds", value.get("species", []))
    weight = value.get("max_kg", value.get("max_weight_kg"))
    fee = value.get("fee_rub", value.get("fee_rub_per_night"))
    if not isinstance(allowed, bool) or not isinstance(kinds, list):
        return None
    if any(kind not in ("dog", "cat") for kind in kinds) or (allowed and not kinds):
        return None
    for number in (weight, fee):
        if number is not None and (
            isinstance(number, bool)
            or not isinstance(number, int | float)
            or not math.isfinite(number)
            or number < 0
        ):
            return None
    return {
        **value,
        "allowed": allowed,
        "kinds": kinds,
        "max_kg": weight,
        "fee_rub": fee,
        "summary": "С животными" if allowed else "Без животных",
    }
