from collections.abc import Mapping
from enum import StrEnum
from typing import Any


class ValueType(StrEnum):
    PROBABILITY = "probability"
    NUMBER = "number"
    CATEGORY = "category"
    RECORD = "record"


def probability_of_yes(value: Any, confidence: float) -> float:
    return confidence if bool(value) else 1 - confidence


def as_record(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {"value": value}
