from collections.abc import Mapping
from enum import StrEnum
from typing import Any


class ValueType(StrEnum):
    """
    How a characteristic's value looks and how sources about it are merged.

    `probability`: a yes/no statement; an observation says yes or no with some confidence,
    and the fact's confidence is the probability that its statement is true.
    `number`: minutes, metres, decibels; merged by confidence-weighted average.
    `category`: one of a closed set; the most confident source wins per cell.
    `record`: structured (pet policy, route summary); the most authoritative source wins.
    """

    PROBABILITY = "probability"
    NUMBER = "number"
    CATEGORY = "category"
    RECORD = "record"


def probability_of_yes(value: Any, confidence: float) -> float:
    """`value=True, confidence=0.8` and `value=False, confidence=0.2` say the same thing."""
    return confidence if bool(value) else 1 - confidence


def as_record(value: Any) -> Mapping[str, Any]:
    return value if isinstance(value, Mapping) else {"value": value}
