"""Coverage of the regional demo; departure cities are not destinations."""

import re

from app.domain.search.text import normalize

_OUTSIDE = re.compile(
    r"\b(?:москв[а-я]*|питер[а-я]*|санкт-петербург[а-я]*|казан[а-я]*|"
    r"геленджик[а-я]*|анап[а-я]*|дуба[ий][а-я]*|стамбул[а-я]*|"
    r"moscow|london|paris|istanbul|dubai)\b"
)
REGION_HINT = (
    "Пока ищем только в Большом Сочи: Сочи, Адлер, Хоста, Сириус и Красная Поляна. "
    "Выберите место в этом регионе."
)


def outside_region(text: str | None) -> bool:
    norm = normalize(text or "")
    return any(
        not re.search(r"\b(?:из|от|from)\s*$", norm[: match.start()])
        for match in _OUTSIDE.finditer(norm)
    )
