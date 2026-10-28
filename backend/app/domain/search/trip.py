"""Dates, guests, budget and district from free text (09 §7.1), without an LLM."""

import re
from dataclasses import dataclass, replace
from datetime import date

from app.domain.search.text import MONTHS_GENITIVE, MONTHS_PREPOSITIONAL, normalize, to_number

AREAS = {
    "center": ("центр", "центре", "центральн", "морвокзал", "навагинск"),
    "khosta": ("хоста", "хосте", "хосты", "кудепст"),
    "adler": ("адлер", "адлере", "аэропорт"),
    "sirius": ("сириус", "имеретинск", "олимпийск парк", "олимпийском парке"),
    "krasnaya_polyana": (
        "красная поляна", "красной поляне", "поляна", "поляне", "роза хутор", "эсто-садок",
        "эстосадок", "газпром лаура",
    ),
}  # fmt: skip

_MONTH_WORD = "|".join(MONTHS_GENITIVE)
_RANGE_SAME_MONTH = re.compile(
    rf"(?:с\s+)?(\d{{1,2}})\s*(?:-|–|—|по|до)\s*(\d{{1,2}})\s+({_MONTH_WORD})(?:\s+(\d{{4}}))?"
)
_RANGE_TWO_MONTHS = re.compile(
    rf"(?:с\s+)?(\d{{1,2}})\s+({_MONTH_WORD})\s*(?:-|–|—|по|до)\s*"
    rf"(\d{{1,2}})\s+({_MONTH_WORD})(?:\s+(\d{{4}}))?"
)
_SINGLE_DAY = re.compile(rf"(\d{{1,2}})\s+({_MONTH_WORD})")
_BUDGET = re.compile(
    r"(?:до|не дороже|максимум|бюджет[а-я]*\s*(?:примерно|около)?|за)\s*"
    r"(\d[\d\s]*(?:[.,]\d+)?)\s*(тыс[а-я]*|к\b|т\.?р|000)?"
)
_BUDGET_THOUSANDS = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:тыс|к)\b")
_ADULTS = re.compile(r"(\d+|двое|трое|четверо|двух|трех|двоих)\s+взросл")
_CHILDREN = re.compile(r"(\d+|двое|трое|двух|одного|один|одна)\s+(?:дет|ребен|малыш)")


@dataclass(frozen=True, slots=True)
class TripDraft:
    check_in: date | None = None
    check_out: date | None = None
    month: int | None = None
    adults: int | None = None
    children: int | None = None
    budget_per_night: int | None = None
    area: str | None = None


def parse_trip(text: str, *, today: date) -> TripDraft:
    norm = normalize(text)
    trip = _dates(norm, today)
    trip = replace(trip, adults=_adults(norm), children=_children(norm))
    return replace(trip, budget_per_night=_budget(norm), area=_area(norm))


def _year(month: int, explicit: str | None, today: date) -> int:
    if explicit:
        return int(explicit)
    return today.year if month >= today.month else today.year + 1


def _dates(norm: str, today: date) -> TripDraft:
    if m := _RANGE_TWO_MONTHS.search(norm):
        d1, m1, d2, m2, year = m.groups()
        month1, month2 = MONTHS_GENITIVE[m1], MONTHS_GENITIVE[m2]
        y1 = _year(month1, year, today)
        y2 = y1 + 1 if month2 < month1 else y1
        return TripDraft(check_in=date(y1, month1, int(d1)), check_out=date(y2, month2, int(d2)))
    if m := _RANGE_SAME_MONTH.search(norm):
        d1, d2, month_word, year = m.groups()
        month = MONTHS_GENITIVE[month_word]
        y = _year(month, year, today)
        return TripDraft(check_in=date(y, month, int(d1)), check_out=date(y, month, int(d2)))
    if m := _SINGLE_DAY.search(norm):
        month = MONTHS_GENITIVE[m.group(2)]
        return TripDraft(check_in=date(_year(month, None, today), month, int(m.group(1))))
    for word, month in MONTHS_PREPOSITIONAL.items():
        if re.search(rf"\b(?:в|на)\s+{word}\b", norm):
            return TripDraft(month=month)
    return TripDraft()


def _adults(norm: str) -> int | None:
    if m := _ADULTS.search(norm):
        value = to_number(m.group(1)) or {"двоих": 2}.get(m.group(1))
        return int(value) if value else None
    if m := re.search(r"\b(\d+|два|двое|трое|три|четыре|четверо)\s+человек", norm):
        value = to_number(m.group(1))
        return int(value) if value else None
    if re.search(r"\b(вдвоем|нас двое|на двоих|с девушкой|с парнем|с женой|с мужем|пара)\b", norm):
        return 2
    if re.search(r"\b(одна|один|в одиночку|соло)\b", norm) and "ребен" not in norm:
        return 1
    return None


def _children(norm: str) -> int | None:
    if m := _CHILDREN.search(norm):
        value = to_number(m.group(1))
        return int(value) if value else 1
    if re.search(
        r"\b(с ребенком|ребенк|ребенок|с малышом|малыш|с детьми|сын|дочк|дочь|коляск)", norm
    ):
        return 1
    return None


def _budget(norm: str) -> int | None:
    if m := _BUDGET_THOUSANDS.search(norm):
        return int(float(m.group(1).replace(",", ".")) * 1000)
    for m in _BUDGET.finditer(norm):
        digits = m.group(1).replace(" ", "")
        value = to_number(digits)
        if value is None:
            continue
        if m.group(2) and m.group(2).startswith(("тыс", "к", "т")):
            value *= 1000
        if 1000 <= value <= 200_000:
            return int(value)
    return None


def _area(norm: str) -> str | None:
    for key, cues in AREAS.items():
        if any(cue in norm for cue in cues):
            return key
    return None
