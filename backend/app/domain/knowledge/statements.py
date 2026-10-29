import string
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from app.domain.knowledge.scope import MONTHS, Facade, Scope

FACADE_SHORT: Mapping[Facade, str] = {
    Facade.N: "С",
    Facade.NE: "СВ",
    Facade.E: "В",
    Facade.SE: "ЮВ",
    Facade.S: "Ю",
    Facade.SW: "ЮЗ",
    Facade.W: "З",
    Facade.NW: "СЗ",
}
FACADE_ADJECTIVE: Mapping[Facade, str] = {
    Facade.N: "северную",
    Facade.NE: "северо-восточную",
    Facade.E: "восточную",
    Facade.SE: "юго-восточную",
    Facade.S: "южную",
    Facade.SW: "юго-западную",
    Facade.W: "западную",
    Facade.NW: "северо-западную",
}
MONTH_NAMES = (
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
)  # fmt: skip


@dataclass(frozen=True, slots=True)
class StatementTemplate:
    yes: str | None = None
    no: str | None = None
    template: str | None = None

    def render(self, value: Any) -> str:
        if self.template is not None:
            return _format(self.template, value)
        return (self.yes if bool(value) else self.no) or ""


def _format(template: str, value: Any) -> str:
    fields = value if isinstance(value, Mapping) else {"value": value}
    names = {name for _, name, _, _ in string.Formatter().parse(template) if name}
    safe = {name: _pretty(fields.get(name)) for name in names}
    return template.format(**safe)


def _pretty(value: Any) -> str:
    if value is None:
        return "—"
    if isinstance(value, float):
        return f"{value:.0f}" if abs(value) >= 10 else f"{value:.1f}".replace(".", ",")
    return str(value)


def scope_text(scope: Scope) -> str:
    parts = []
    if scope.facades:
        names = [FACADE_SHORT[f] for f in Facade if f in scope.facades]
        side = names[0] if len(names) == 1 else ", ".join(names[:-1]) + " и " + names[-1]
        parts.append(f"{side}-фасад" if len(names) == 1 else f"фасады {side}")
    floors = _floors_text(scope.floor_from, scope.floor_to)
    if floors:
        parts.append(floors)
    text = ", ".join(parts)
    if scope.months:
        text = f"{text} · {months_text(scope.months)}" if text else months_text(scope.months)
    if scope.room_types:
        text = f"{text} · категории: {len(scope.room_types)}" if text else "отдельные категории"
    return text or "весь отель"


def _floors_text(floor_from: int | None, floor_to: int | None) -> str:
    if floor_from in (None, 1) and floor_to is None:
        return ""
    if floor_to is None:
        return f"этаж {floor_from} и выше"
    if floor_from in (None, 1):
        return f"этажи до {floor_to}-го" if floor_to > 1 else "1-й этаж"
    if floor_from == floor_to:
        return f"{floor_from}-й этаж"
    return f"этажи {floor_from}–{floor_to}"


def months_text(months: frozenset[int]) -> str:
    if set(months) == set(MONTHS):
        return "круглый год"
    ordered = sorted(months)
    runs: list[list[int]] = []
    for month in ordered:
        if runs and runs[-1][-1] == month - 1:
            runs[-1].append(month)
        else:
            runs.append([month])
    if len(runs) > 1 and runs[0][0] == 1 and runs[-1][-1] == 12:
        runs[0] = runs.pop() + runs[0]
    return ", ".join(
        MONTH_NAMES[r[0] - 1]
        if len(r) == 1
        else f"{MONTH_NAMES[r[0] - 1]}–{MONTH_NAMES[r[-1] - 1]}"
        for r in runs
    )


def facade_phrase(facade: Facade) -> str:
    return FACADE_ADJECTIVE[facade]
