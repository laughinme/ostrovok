"""The check that keeps the LLM honest (09 §2): a rephrased explanation may use only the
numbers of the facts it was given; anything else falls back to the template."""

import re
from collections.abc import Iterable
from decimal import Decimal

_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")


def numbers(text: str) -> set[str]:
    return {str(Decimal(n.replace(",", ".")).normalize()) for n in _NUMBER.findall(text)}


def faithful(rewritten: str, sources: Iterable[str], *, max_len: int = 220) -> bool:
    allowed: set[str] = set()
    for source in sources:
        allowed |= numbers(source)
    return 0 < len(rewritten) <= max_len and numbers(rewritten) <= allowed
