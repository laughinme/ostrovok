import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from app.domain.search.intent import covers, stems
from app.domain.search.text import normalize, to_number

DEFAULT_WALK_MINUTES = 10
_TRANSLIT = str.maketrans(
    {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ж": "zh", "з": "z", "и": "i",
        "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s",
        "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
        "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    }
)  # fmt: skip
_SUBJECTIVE = ("уютн", "красив", "вайб", "душевн", "романтичн", "атмосферн", "стильн")
_ASK_CUES = ("можно ли", "можно с", "разреш", "есть ли", "в номере", "в отеле", "с собак",
             "с кошк", "с животн", "бассейн", "завтрак", "трансфер", "кроватк", "курить",
             "детское меню", "поздний выезд", "ранний заезд")  # fmt: skip
_SEA_TARGET = re.compile(r"\bдо (?:моря|пляжа|набережной|берега)\b")
_METERS = re.compile(r"(\d+)\s*(?:м\b|метр)")
_KM = re.compile(r"(\d+(?:\.\d+)?)\s*км")
_MINUTES = re.compile(r"(\d+|[а-я]+)\s*(?:-|–)?\s*мин")


class Decision(StrEnum):
    COMPUTE = "compute"
    ASK = "ask_hotelier"
    CANNOT = "cannot"


@dataclass(frozen=True, slots=True)
class PlaceTerm:
    name: str
    any_of: tuple[Mapping[str, Sequence[str]], ...]
    name_regex: str | None = None
    uncertain: bool = False


@dataclass(frozen=True, slots=True)
class RecipeDraft:
    decision: Decision
    reason: str
    key: str = ""
    title: str = ""
    recipe: Mapping[str, Any] = field(default_factory=dict)
    yes: str = ""
    no: str = ""
    synonyms: tuple[str, ...] = ()
    question: str | None = None
    caveats: tuple[str, ...] = ()


def place_terms(raw: Mapping[str, Any]) -> list[PlaceTerm]:
    terms = []
    for name, entry in raw.items():
        alternatives = tuple(
            {k: v if isinstance(v, list) else [str(v)] for k, v in alt.items()}
            for alt in entry.get("osm", [])
        )
        terms.append(
            PlaceTerm(name, alternatives, entry.get("name_regex"), bool(entry.get("uncertain")))
        )
    return terms


def slug(text: str) -> str:
    latin = normalize(text).translate(_TRANSLIT)
    return re.sub(r"[^a-z0-9]+", "_", latin).strip("_")[:40]


def propose(description: str, places: Sequence[PlaceTerm]) -> RecipeDraft:
    norm = normalize(description)
    if any(cue in norm for cue in _SUBJECTIVE):
        return RecipeDraft(Decision.CANNOT, "субъективное: по открытым данным не проверить")
    if any(cue in norm for cue in _ASK_CUES):
        return _ask(description)
    if _SEA_TARGET.search(norm):
        return _walk_to_sea(description, norm)
    term = _best_term(norm, places)
    if term is None:
        return RecipeDraft(Decision.CANNOT, "не знаем, какие объекты OSM это описывают")
    return _poi(description, norm, term)


def _best_term(norm: str, places: Sequence[PlaceTerm]) -> PlaceTerm | None:
    present = stems(norm)
    matching = [t for t in places if (s := stems(normalize(t.name))) and covers(present, s)]
    return max(matching, key=lambda t: len(stems(normalize(t.name))), default=None)


def _minutes(norm: str) -> int | None:
    for m in _MINUTES.finditer(norm):
        value = to_number(m.group(1))
        if value:
            return int(value)
    return None


def _poi(description: str, norm: str, term: PlaceTerm) -> RecipeDraft:
    named = [alt for alt in term.any_of if "name" in alt]
    plain = [dict(alt) for alt in term.any_of if "name" not in alt]
    if plain:
        tag_filter: dict[str, Any] = {"any_of": plain}
    else:
        tag_filter = {
            "any_of": [{k: v for k, v in alt.items() if k != "name"} for alt in named],
            "name_regex": term.name_regex,
        }
    radius: dict[str, Any]
    if m := _METERS.search(norm):
        radius = {"within_m": float(m.group(1))}
        where = f"в {m.group(1)} м"
    elif m := _KM.search(norm):
        radius = {"within_m": float(m.group(1)) * 1000}
        where = f"в {m.group(1)} км"
    else:
        minutes = _minutes(norm) or DEFAULT_WALK_MINUTES
        radius = {"within_minutes": float(minutes)}
        where = f"в {minutes} минутах пешком"
    open_ = (
        "24_7"
        if "круглосуточ" in norm or "24 7" in norm
        else (
            "night"
            if any(c in norm for c in ("ночью", "допоздна", "поздно"))
            else ("morning" if any(c in norm for c in ("утром", "завтрак")) else "any")
        )
    )
    title = f"{term.name.capitalize()} {where}"
    return RecipeDraft(
        decision=Decision.COMPUTE,
        reason=f"место из словаря OSM: «{term.name}»",
        key=slug(f"{term.name} {where}"),
        title=title,
        recipe={"kind": "poi_nearby", "poi": tag_filter, "open": open_, **radius},
        yes=title,
        no=f"{term.name.capitalize()} {where} нет",
        synonyms=(term.name, normalize(description)),
        caveats=("По названиям в OSM: возможны пропуски",) if term.uncertain else (),
    )


def _walk_to_sea(description: str, norm: str) -> RecipeDraft:
    stroller = "коляск" in norm
    wheelchair = "кресл" in norm or "инвалид" in norm
    profile = "stroller" if stroller else "wheelchair" if wheelchair else "walk"
    minutes = _minutes(norm) or 15
    no_steps = profile != "walk" or "без ступен" in norm or "без лестниц" in norm
    who = {"stroller": "с коляской", "wheelchair": "на кресле", "walk": "пешком"}[profile]
    title = f"До моря {who} за {minutes} мин" + (" без ступеней" if no_steps else "")
    return RecipeDraft(
        decision=Decision.COMPUTE,
        reason="маршрут до пляжа по пешеходному графу",
        key=slug(f"sea {profile} {minutes}"),
        title=title,
        recipe={
            "kind": "walk_to",
            "target": "beach",
            "profile": profile,
            "max_minutes": float(minutes),
            "no_steps": no_steps,
        },
        yes=title,
        no=f"{title} — не получится",
        synonyms=(normalize(description),),
    )


def _ask(description: str) -> RecipeDraft:
    text = description.strip().rstrip("?.!")
    return RecipeDraft(
        decision=Decision.ASK,
        reason="правило или оснащение отеля: по карте не узнать, спросим",
        key=slug(text),
        title=text[:1].upper() + text[1:],
        recipe={
            "kind": "ask_hotelier",
            "question": f"Подскажите, пожалуйста: {text[:1].lower() + text[1:]}?",
            "answer_kind": "free_text",
        },
        yes=text[:1].upper() + text[1:] + " — да",
        no=text[:1].upper() + text[1:] + " — нет",
        synonyms=(normalize(description),),
        question=f"Подскажите, пожалуйста: {text[:1].lower() + text[1:]}?",
    )
