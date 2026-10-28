"""Dates, guests, budget and district from free text (09 §7.1), without an LLM."""

import re
from dataclasses import dataclass, replace
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.domain.search.text import MONTHS_GENITIVE, MONTHS_PREPOSITIONAL, normalize, to_number

AREAS = {
    "center": ("центр", "центре", "центральн", "морвокзал", "навагинск", "downtown"),
    "khosta": ("хоста", "хосте", "хосты", "хосту", "кудепст", "khosta"),
    "adler": ("адлер", "адлере", "аэропорт", "adler"),
    "sirius": ("сириус", "имеретинск", "олимпийск парк", "олимпийском парке", "sirius"),
    "krasnaya_polyana": (
        "красная поляна", "красной поляне", "поляна", "поляне", "роза хутор", "эсто-садок",
        "эстосадок", "газпром лаура", "krasnaya polyana", "rosa khutor",
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
_SINGLE_DAY = re.compile(rf"(\d{{1,2}})\s+({_MONTH_WORD})(?:\s+(\d{{4}}))?")
_BUDGET = re.compile(
    r"(?:до|не дороже|максимум|бюджет[а-я]*\s*(?:примерно|около)?|за)\s*"
    r"(\d[\d\s]*(?:[.,]\d+)?)\s*(тыс[а-я]*|к\b|т\.?р|000)?"
)
_BUDGET_THOUSANDS = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:тыс[а-я]*|к)\b")
_ADULTS = re.compile(r"(\d+|один|одна|два|три|четыре|двое|трое|четверо|двух|трех|двоих)\s+взросл")
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


def today_in_sochi(now: datetime) -> date:
    return now.astimezone(ZoneInfo("Europe/Moscow")).date()


def parse_trip(text: str, *, today: date) -> TripDraft:
    norm = normalize(text)
    try:
        trip = _dates(norm, today)
        if trip.check_in and trip.check_out and trip.check_out <= trip.check_in:
            trip = TripDraft()
    except (ValueError, OverflowError):
        trip = TripDraft()
    trip = replace(trip, adults=_adults(norm), children=_children(norm))
    return replace(trip, budget_per_night=_budget(norm), area=_area(norm))


def _year(month: int, explicit: str | None, today: date) -> int:
    if explicit:
        return int(explicit)
    return today.year if month >= today.month else today.year + 1


def _dates(norm: str, today: date) -> TripDraft:
    numeric = re.search(
        r"(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})"
        r"(?:\s*[-–—]\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4}))?",
        norm,
    )
    if numeric:

        def day(value: str) -> date:
            if "." in value:
                d, m, y = value.split(".")
                return date(int(y), int(m), int(d))
            return date.fromisoformat(value)

        return TripDraft(
            check_in=day(numeric[1]), check_out=day(numeric[2]) if numeric[2] else None
        )
    if m := _RANGE_TWO_MONTHS.search(norm):
        d1, m1, d2, m2, year = m.groups()
        month1, month2 = MONTHS_GENITIVE[m1], MONTHS_GENITIVE[m2]
        y1 = _year(month1, None, today) if not year else int(year) - int(month2 < month1)
        y2 = y1 + int(month2 < month1)
        return TripDraft(check_in=date(y1, month1, int(d1)), check_out=date(y2, month2, int(d2)))
    if m := _RANGE_SAME_MONTH.search(norm):
        d1, d2, month_word, year = m.groups()
        month = MONTHS_GENITIVE[month_word]
        y = _year(month, year, today)
        return TripDraft(check_in=date(y, month, int(d1)), check_out=date(y, month, int(d2)))
    if m := _SINGLE_DAY.search(norm):
        month = MONTHS_GENITIVE[m.group(2)]
        return TripDraft(check_in=date(_year(month, m.group(3), today), month, int(m.group(1))))
    for word, month in MONTHS_PREPOSITIONAL.items():
        if re.search(rf"\b(?:в|на)\s+{word}\b", norm):
            return TripDraft(month=month)
    return _relative_dates(norm, today)


def _relative_dates(norm: str, today: date) -> TripDraft:
    if re.search(r"\b(?:в следующем месяце|next month)\b", norm):
        return TripDraft(month=today.month % 12 + 1)
    if "майски" in norm:
        return TripDraft(month=5)
    start = None
    if re.search(r"\b(?:на|в эти|в следующие|в ближайшие) выходн|\bthis weekend\b", norm):
        start = today + timedelta(days=(5 - today.weekday()) % 7)
        if "следующие" in norm:
            start += timedelta(days=7)
        return TripDraft(check_in=start, check_out=start + timedelta(days=2))
    if "завтра" in norm or "tomorrow" in norm:
        start = today + timedelta(days=1)
    elif "сегодня" in norm or "today" in norm:
        start = today
    elif "через неделю" in norm:
        start = today + timedelta(days=7)
    nights = re.search(r"на (\d+|[а-я]+) ноч", norm)
    duration = to_number(nights[1]) if nights else None
    return TripDraft(
        check_in=start,
        check_out=start + timedelta(days=int(duration))
        if start and duration and 0 < duration < 366
        else None,
    )


def trip_hints(text: str, trip: TripDraft) -> tuple[str, ...]:
    norm = normalize(text)
    hints = []
    if not trip.check_in and re.search(
        r"\d{1,2}\s+(?:" + _MONTH_WORD + r")|\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4}", norm
    ):
        hints.append(
            "Не удалось разобрать даты. Проверьте календарь: выезд должен быть позже заезда."
        )
    for pattern, minimum in ((_ADULTS, 1), (_CHILDREN, 0)):
        if match := pattern.search(norm):
            count = to_number(match[1])
            if count is not None and not minimum <= count <= 10:
                hints.append(
                    "Укажите от 1 до 10 взрослых и от 0 до 10 детей. "
                    "Для большой группы уточните размещение у отеля."
                )
                break
    if trip.budget_per_night is None and (
        _BUDGET_THOUSANDS.search(norm) or re.search(r"руб|₽|бюджет", norm)
    ):
        hints.append("Уточните бюджет за ночь: от 1 до 200 000 ₽.")
    if trip.month == 5 and "майски" in norm:
        hints.append("Ищем на май. Уточните даты майских праздников.")
    return tuple(hints)


def _adults(norm: str) -> int | None:
    if m := _ADULTS.search(norm):
        value = to_number(m.group(1)) or {"двоих": 2}.get(m.group(1))
        return int(value) if value is not None and 1 <= value <= 10 else None
    if m := re.search(r"\b(\d+|два|двое|трое|три|четыре|четверо)\s+человек", norm):
        value = to_number(m.group(1))
        return int(value) if value is not None and 1 <= value <= 10 else None
    if m := re.search(r"\b(\d+|one|two|three|four) adults?\b", norm):
        return {"one": 1, "two": 2, "three": 3, "four": 4}.get(m[1]) or (
            int(m[1]) if m[1].isdigit() and 1 <= int(m[1]) <= 10 else None
        )
    if re.search(
        r"\b(нас трое|вдвоем|нас двое|на двоих|с девушкой|с парнем|с женой|с мужем|пара)\b", norm
    ):
        return 3 if "нас трое" in norm else 2
    if re.search(r"\b(одна|один|в одиночку|соло)\b", norm) and "ребен" not in norm:
        return 1
    return None


def _children(norm: str) -> int | None:
    if "без детей" in norm or "без ребенка" in norm:
        return 0
    if re.search(r"с двумя детьми", norm):
        return 2
    if m := re.search(r"\b(\d+|one|two|three) (?:children|child)\b", norm):
        return {"one": 1, "two": 2, "three": 3}.get(m[1]) or (
            int(m[1]) if m[1].isdigit() and 0 <= int(m[1]) <= 10 else None
        )
    if m := _CHILDREN.search(norm):
        value = to_number(m.group(1))
        return int(value) if value is not None and 0 <= value <= 10 else None
    if re.search(
        r"\b(с ребенком|ребенк|ребенок|с малышом|малыш|с детьми|сын|дочк|дочь|коляск)", norm
    ):
        return 1
    return None


def _budget(norm: str) -> int | None:
    if m := _BUDGET_THOUSANDS.search(norm):
        thousands = float(m.group(1).replace(",", ".")) * 1000
        return int(thousands) if 0 < thousands <= 200_000 else None
    for m in _BUDGET.finditer(norm):
        digits = m.group(1).replace(" ", "")
        value = to_number(digits)
        if value is None:
            continue
        if m.group(2) and m.group(2).startswith(("тыс", "к", "т")):
            value *= 1000
        if 0 < value <= 200_000 and (value >= 1000 or re.match(r"\s*(?:₽|руб)", norm[m.end() :])):
            return int(value)
    return None


def _area(norm: str) -> str | None:
    found = [
        (match.start(), key)
        for key, cues in AREAS.items()
        for cue in cues
        for match in re.finditer(r"(?<![а-яa-z])" + re.escape(cue), norm)
        if not re.search(r"\b(?:не|кроме)\s*$", norm[: match.start()])
    ]
    return max(found)[1] if found else None
