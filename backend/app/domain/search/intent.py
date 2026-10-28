"""
The rule-based Intent agent (09 §7.1): text → chips, trip, hints. The LLM planner produces the
same `Intent`; this one needs no key and is the fallback when the LLM is unavailable.
"""

import re
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date
from enum import StrEnum
from functools import lru_cache
from itertools import pairwise
from typing import Any

import snowballstemmer
from rapidfuzz import fuzz

from app.domain.knowledge.characteristic import Checkable
from app.domain.search.region import REGION_HINT, outside_region
from app.domain.search.text import normalize, sentences, to_number
from app.domain.search.trip import TripDraft, parse_trip, trip_hints


class Importance(StrEnum):
    MUST = "must"
    IMPORTANT = "important"
    NICE = "nice"


WEIGHTS: Mapping[Importance, float] = {
    Importance.MUST: 3.0,
    Importance.IMPORTANT: 2.0,
    Importance.NICE: 1.0,
}

_MUST = ("обязательно", "главное", "принципиально", "непременно", "только чтобы", "критично",
         "нужно чтоб", "нужно, чтоб", "чтобы точно")  # fmt: skip
_NICE = ("желательно", "хотелось бы", "было бы", "если можно", "по возможности", "неплохо",
         "не обязательно", "бонус", "приятно")  # fmt: skip
_SUBJECTIVE = ("уютн", "красив", "вайб", "душевн", "романтичн", "атмосферн", "стильн", "милый")
_POI_CUE = re.compile(
    r"(?P<what>[а-я]+(?:\s[а-я]+)?)\s+(?:рядом|поблизости|недалеко|в шаговой|"
    r"в \d+\s*мин|за \d+\s*мин|минут \d+|минутах)"
)
_STOP_WHAT = {"море", "моря", "пляж", "пляжа", "отель", "номер", "был", "была", "было", "чтоб",
              "чтобы", "все", "это", "тоже", "еще", "и", "а", "но", "была бы"}  # fmt: skip
_MINUTES = re.compile(r"(\d+|[а-я]+)\s*(?:-|–)?\s*(?:х\s*)?мин")
_MINUTES_AFTER = re.compile(r"минут[а-я]*\s+(\d+)")
_FLOOR = re.compile(
    r"(?:с|от|выше)\s+(\d+|[а-я]+?)(?:-?го|-?ого)?\s+этаж|этаж[а-я]*\s+(?:с|от)\s+([а-я]+|\d+)"
)
_DECLINE = re.compile(
    r"\bне\s+(?:нуж|надо|важ|интерес|беспоко|волну|требу|принципиальн|критичн)"
    r"|\bбез\s+разницы"
)
_DECLINE_WINDOW = 3
_PREFIX_STEM = 4
_WEIGHT = re.compile(r"(\d+)\s*(?:кг|кило)")


@dataclass(frozen=True, slots=True)
class Chip:
    id: str
    label: str
    importance: Importance
    checkable: Checkable
    characteristic: str | None = None
    params: Mapping[str, Any] = field(default_factory=dict)
    from_profile: bool = False


@dataclass(frozen=True, slots=True)
class Intent:
    text: str | None
    chips: tuple[Chip, ...]
    trip: TripDraft
    hints: tuple[str, ...]
    planner: str = "rules"


@dataclass(frozen=True, slots=True)
class Vocabulary:
    """What the rule parser knows: characteristic → title, checkability and phrases."""

    titles: Mapping[str, str]
    checkable: Mapping[str, Checkable]
    phrases: Mapping[str, tuple[str, ...]]
    stems: Mapping[str, tuple[frozenset[str], ...]]

    @classmethod
    def build(
        cls,
        entries: Iterable[tuple[str, str, Checkable, Sequence[str]]],
        extra: Mapping[str, Sequence[str]] | None = None,
    ) -> "Vocabulary":
        titles, checkable, phrases = {}, {}, {}
        for key, title, how, synonyms in entries:
            titles[key] = title
            checkable[key] = how
            found = {normalize(s) for s in (title, *synonyms, *(extra or {}).get(key, ()))}
            phrases[key] = tuple(sorted((p for p in found if len(p) > 2), key=len, reverse=True))
        return cls(
            titles,
            checkable,
            phrases,
            {k: tuple(dict.fromkeys(stems(p) for p in v)) for k, v in phrases.items()},
        )


def parse_intent(text: str, vocabulary: Vocabulary, *, today: date) -> Intent:
    chips: list[Chip] = []
    seen: set[str] = set()
    for sentence in sentences(text):
        norm = normalize(sentence)
        importance = _importance(norm)
        params = _params(norm)
        clauses = [normalize(c) for c in re.split(r",|\bно\b|\bа ещё\b", sentence) if c.strip()]
        keys = [k for k in _match(norm, vocabulary) if not _declined(k, clauses, vocabulary)]
        for key in keys:
            if key in seen:
                continue
            seen.add(key)
            chips.append(
                Chip(
                    id=f"c{len(chips) + 1}",
                    label=vocabulary.titles[key],
                    importance=_clause_importance(key, clauses, vocabulary) or importance,
                    checkable=vocabulary.checkable[key],
                    characteristic=key,
                    params=_params_for(key, params),
                )
            )
        if not keys:
            chips.extend(_unknown(norm, importance, params, start=len(chips) + 1))
    trip = parse_trip(text, today=today)
    return Intent(text=text, chips=tuple(chips), trip=trip, hints=_hints(text, chips, trip))


_STOPWORDS = frozenset(
    {
        "в",
        "на",
        "с",
        "со",
        "из",
        "и",
        "к",
        "у",
        "по",
        "до",
        "за",
        "от",
        "о",
        "а",
        "чтобы",
        "чтоб",
        "был",
        "была",
        "было",
        "были",
        "будет",
        "мне",
        "нам",
        "нас",
        "мы",
        "я",
        "хочу",
        "хотим",
        "нужен",
        "нужна",
        "нужно",
        "очень",
        "прям",
        "прямо",
        "бы",
        "же",
        "ли",
        "то",
        "это",
        "там",
        "тут",
        "где",
    }
)  # fmt: skip


def stems(text: str) -> frozenset[str]:
    """Snowball stems: «ночью» and «ночь», «закат» and «закатом», «тихий» and «тихо» meet."""
    words = re.findall(r"[а-яa-z0-9]+", text)
    # «у моря» is about being near the sea, not just about the sea: keep the preposition's sense.
    near = {"у" + _stem(after) for before, after in pairwise(words) if before == "у"}
    return frozenset(_stem(w) for w in words if w not in _STOPWORDS) | near


def covers(present: frozenset[str], phrase: frozenset[str]) -> bool:
    """Every phrase stem occurs in the text; a long stem also matches a longer word form."""
    return all(any(_same(word, stem) for word in present) for stem in phrase)


def _same(word: str, stem: str) -> bool:
    # Snowball keeps some suffixes and fleeting vowels: «собак» ~ «собакен», «ступен» ~ «ступенек»,
    # «стройплощадк» ~ «стройплощадок». Long stems may differ in their last two letters.
    if word == stem:
        return True
    common = next(
        (i for i, (a, b) in enumerate(zip(word, stem, strict=False)) if a != b),
        min(len(word), len(stem)),
    )
    return (common == len(stem) and common >= _PREFIX_STEM) or (
        common > _PREFIX_STEM and common >= max(len(word), len(stem)) - 2
    )


@lru_cache(maxsize=8192)
def _stem(word: str) -> str:
    # A fresh stemmer per new word: the Snowball object keeps state between calls.
    stem: str = snowballstemmer.stemmer("russian").stemWord(word)
    return stem


def _match(norm: str, vocabulary: Vocabulary) -> list[str]:
    """
    A phrase matches when all its word stems occur in the sentence, in any order.
    The most specific phrase per characteristic wins, and a characteristic whose match is a
    strict part of another one's («тихо» inside «тихо днём») is dropped.
    """
    present = stems(norm)
    best: dict[str, frozenset[str]] = {}
    for key, phrases in vocabulary.stems.items():
        for phrase in phrases:
            if phrase and covers(present, phrase) and len(phrase) > len(best.get(key, frozenset())):
                best[key] = phrase
    keys = [
        key
        for key, phrase in best.items()
        if not any(phrase < other for k, other in best.items() if k != key)
    ]
    if not keys:
        return [key for _, key in _fuzzy(norm, vocabulary)]
    return sorted(keys, key=lambda k: min(norm.find(s) % 10_000 for s in best[k]))


def _fuzzy(norm: str, vocabulary: Vocabulary) -> list[tuple[int, str]]:
    """Typos like «вид на морэ»: only multi-word phrases, to keep false matches out."""
    best: list[tuple[int, str]] = []
    for key, phrases in vocabulary.phrases.items():
        score = max(
            (
                fuzz.partial_ratio(p, norm)
                for p in phrases
                if " " in p
                and len(norm) >= len(p) * 0.8
                and any(len(word) >= 3 and word in stems(norm) for word in stems(p))
            ),
            default=0,
        )
        if score >= 90:
            best.append((0, key))
    return best[:2]


def _declined(key: str, clauses: Sequence[str], vocabulary: Vocabulary) -> bool:
    """
    «Вид на море не нужен», «парковка — всё равно»: the wish is dropped when a refusal stands
    within three words of it in every clause that names it.
    """
    absence = {
        "pets_policy": r"\bбез (?:собак|животн|питомц)",
        "parking": r"\bбез машин",
        "playground_walk": r"\bбез дет",
    }.get(key)
    if absence and any(re.search(absence, clause) for clause in clauses):
        positive = [clause for clause in clauses if not re.search(absence, clause)]
        if not any(
            phrase and covers(stems(clause), phrase)
            for clause in positive
            for phrase in vocabulary.stems[key]
        ):
            return True
    naming = 0
    for clause in clauses:
        words = re.findall(r"[а-яa-z0-9]+", clause)
        word_stems = [_stem(w) for w in words]
        for phrase in vocabulary.stems[key]:
            if not phrase or not covers(frozenset(word_stems), phrase):
                continue
            at = [i for i, stem in enumerate(word_stems) if any(_same(stem, p) for p in phrase)]
            near = " ".join(
                words[max(min(at) - _DECLINE_WINDOW, 0) : max(at) + _DECLINE_WINDOW + 1]
            )
            if not _DECLINE.search(near):
                return False
            naming += 1
            break
    return naming > 0


def _clause_importance(
    key: str, clauses: Sequence[str], vocabulary: Vocabulary
) -> Importance | None:
    """«Обязательно тихо, желательно вид на море»: each wish takes the cue of its own clause."""
    for clause in clauses:
        present = stems(clause)
        if any(phrase and covers(present, phrase) for phrase in vocabulary.stems[key]):
            cued = _importance(clause)
            return cued if cued is not Importance.IMPORTANT else None
    return None


def _importance(norm: str) -> Importance:
    if any(cue in norm for cue in _NICE):
        return Importance.NICE
    if any(cue in norm for cue in _MUST):
        return Importance.MUST
    return Importance.IMPORTANT


def _params(norm: str) -> dict[str, Any]:
    params: dict[str, Any] = {}
    for found in (*_MINUTES.finditer(norm), *_MINUTES_AFTER.finditer(norm)):
        minutes = to_number(found.group(1))
        if minutes:
            params["maxWalkMinutes"] = int(minutes)
            break
    if m := _FLOOR.search(norm):
        value = to_number(m.group(1) or m.group(2))
        if value:
            params["minFloor"] = int(value)
    if m := _WEIGHT.search(norm):
        params["dogWeightKg"] = int(m.group(1))
    if "без подъем" in norm or "без горк" in norm or "без лестниц" in norm:
        params["noClimb"] = True
    return params


_PARAMS_BY_KEY = {
    "sea_view": ("minFloor",),
    "sunset_over_sea": ("minFloor",),
    "mountain_view": ("minFloor",),
    "beach_walk": ("maxWalkMinutes", "noClimb"),
    "stroller_to_sea": ("maxWalkMinutes",),
    "pets_policy": ("dogWeightKg",),
}


def _params_for(key: str, params: Mapping[str, Any]) -> dict[str, Any]:
    allowed = _PARAMS_BY_KEY.get(key, ("maxWalkMinutes",))
    return {k: v for k, v in params.items() if k in allowed}


def _unknown(
    norm: str, importance: Importance, params: Mapping[str, Any], *, start: int
) -> list[Chip]:
    """A wish we have no characteristic for: the Curator may learn it (09 §3.2)."""
    match = _POI_CUE.search(norm)
    if match is None:
        return []
    words = [w for w in match.group("what").split() if w not in _STOP_WHAT]
    if not words or any(cue in norm for cue in _SUBJECTIVE):
        return []
    label = " ".join(words)
    return [
        Chip(
            id=f"c{start}",
            label=f"{label[0].upper()}{label[1:]} рядом",
            importance=importance,
            checkable=Checkable.COMPUTE,
            params={k: v for k, v in params.items() if k == "maxWalkMinutes"} | {"what": label},
        )
    ]


def _hints(text: str, chips: Sequence[Chip], trip: TripDraft) -> tuple[str, ...]:
    hints = list(trip_hints(text, trip))
    if outside_region(text):
        hints.insert(0, REGION_HINT)
    norm = normalize(text)
    subjective = [cue for cue in _SUBJECTIVE if cue in norm]
    if norm == "море":
        hints.append("Море из окна или пляж в пешей доступности? Уточните, что важнее.")
    if re.search(r"\bбассейн", norm):
        hints.append(
            "Данных о бассейнах пока нет. Уточните наличие у отеля; "
            "можем проверить вид, тишину и путь до пляжа."
        )
    if subjective:
        hints.append(
            "«Уютно» и «красиво» проверить не можем, но можем найти тишину, вид и зелень рядом"
        )
    if (
        trip.check_in is None
        and trip.month is None
        and any(c.characteristic in {"sunset_over_sea", "sunrise", "climate"} for c in chips)
    ):
        hints.append("Укажите даты — посчитаем закат и погоду именно на них")
    elif not chips and not subjective:
        hints.append("Опишите, что важно: вид, тишина, дорога до моря, что рядом")
    return tuple(hints)
