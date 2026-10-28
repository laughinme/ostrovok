from collections import Counter
from collections.abc import Awaitable, Callable, Mapping, Sequence
from dataclasses import asdict
from datetime import date
from pathlib import Path
from typing import Any

from app.domain.knowledge.curation import Decision, PlaceTerm, RecipeDraft, propose
from app.domain.partner.answers import AnswerParser
from app.domain.quality.metrics import KeyCounts, key_counts, ratio
from app.domain.search.intent import Intent
from app.service.partner.evaluation import evaluate_answers
from app.service.quality.datasets import read_yaml

EVAL_TODAY = date(2026, 10, 28)
TRIP_FIELDS = {"from": "check_in", "to": "check_out", "budget_per_night": "budget_per_night"}


async def intent_metrics(
    parse: Callable[[str], Awaitable[Intent]],
    cases: Sequence[Mapping[str, Any]],
    *,
    require_llm: bool = False,
) -> dict[str, Any]:
    totals: Counter[str] = Counter()
    per_key: dict[str, Counter[str]] = {}
    trip: dict[str, Counter[str]] = {}
    unknown = fallbacks = evaluated = 0
    for case in cases:
        intent = await parse(case["query"])
        fallbacks += intent.planner != "llm"
        if require_llm and intent.planner != "llm":
            continue
        evaluated += 1
        expected = {c["key"] for c in case["chips"] if c["key"] is not None}
        predicted = {c.characteristic for c in intent.chips if c.characteristic is not None}
        counts = key_counts(expected, predicted)
        totals.update(asdict(counts))
        for key in expected | predicted:
            per_key.setdefault(key, Counter()).update(
                asdict(key_counts(expected & {key}, predicted & {key}))
            )
        _trip_counts(trip, case["trip"], intent)
        unknown += sum(c["key"] is None for c in case["chips"]) == sum(
            c.characteristic is None for c in intent.chips
        )
    return {
        "n": evaluated,
        "requested": len(cases),
        "micro": KeyCounts(**totals).scores(),
        "perKey": {k: KeyCounts(**v).scores() for k, v in sorted(per_key.items())},
        "tripFields": {k: {**v, "accuracy": ratio(v["correct"], v["n"])} for k, v in trip.items()},
        "tripAccuracy": ratio(
            sum(v["correct"] for v in trip.values()), sum(v["n"] for v in trip.values())
        ),
        "unknownCountAccuracy": ratio(unknown, evaluated),
        "rulesResults": fallbacks,
    }


def _trip_counts(
    totals: dict[str, Counter[str]], expected: Mapping[str, Any], intent: Intent
) -> None:
    for key, value in expected.items():
        actual = getattr(intent.trip, TRIP_FIELDS.get(key, key))
        if isinstance(actual, date):
            actual = actual.isoformat()
        counts = totals.setdefault(key, Counter())
        counts.update(n=1, correct=int(actual == value))
        if value is not None:
            counts.update(specified=1, specifiedCorrect=int(actual == value))


async def answer_metrics(
    parser: AnswerParser, path: Path, *, require_llm: bool = False
) -> dict[str, Any]:
    result = await evaluate_answers(parser, path, require_llm=require_llm)
    return {
        **asdict(result),
        "fieldAccuracy": ratio(result.exact_fields, result.total_fields),
        "clarificationAccuracy": ratio(result.correct_clarifications, result.total_ambiguous),
        "excludedFields": ["conditions", "window_type", "notes"],
        "note": "Машинные поля R3; свободный текст исключён; low clarity оценивается по переспросу",
    }


def _subset(actual: Any, expected: Any) -> bool:
    if isinstance(expected, dict):
        return isinstance(actual, Mapping) and all(
            k in actual and _subset(actual[k], v) for k, v in expected.items()
        )
    if isinstance(actual, list) and not isinstance(expected, list):
        return expected in actual
    return bool(actual == expected)


def _params(recipe: Mapping[str, Any]) -> dict[str, Any]:
    result = {"min_count": 1, "max_climb_m": None, **recipe}
    result["within"] = {
        "walk_minutes": recipe.get("within_minutes"),
        "meters": recipe.get("within_m"),
    }
    if recipe.get("kind") == "derived":
        result["expr"] = {recipe.get("op"): recipe.get("keys")}
    return result


def _parameter_matches(recipe: Mapping[str, Any], key: str, expected: Any) -> bool:
    if key == "poi":
        poi = recipe.get("poi", {})
        return any(_subset(alt, expected) for alt in poi.get("any_of", [poi]))
    return key in recipe and _subset(recipe[key], expected)


def rules_plan(places: Sequence[PlaceTerm]) -> Callable[[str], Awaitable[RecipeDraft]]:
    async def plan(description: str) -> RecipeDraft:
        return propose(description, places)

    return plan


async def curator_metrics(
    path: Path, plan: Callable[[str], Awaitable[RecipeDraft | None]]
) -> dict[str, Any]:
    cases = await read_yaml(path)
    methods = correct = total = evaluated = 0
    details = []
    for case in cases:
        draft = await plan(case["description"])
        if draft is None:
            continue
        evaluated += 1
        method = "cannot_check" if draft.decision is Decision.CANNOT else draft.recipe.get("kind")
        matched = method == case["expected_method"]
        methods += matched
        params = {
            k: v
            for k, v in case["expected_params"].items()
            if k not in {"question", "reason", "value_schema"}
        }
        normalized = _params(draft.recipe)
        hits = sum(matched and _parameter_matches(normalized, k, v) for k, v in params.items())
        correct += hits
        total += len(params)
        details.append(
            {
                "description": case["description"],
                "expected": case["expected_method"],
                "actual": method,
                "correctParams": hits,
                "totalParams": len(params),
            }
        )
    return {
        "n": evaluated,
        "requested": len(cases),
        "rulesResults": len(cases) - evaluated,
        "methodAccuracy": ratio(methods, evaluated),
        "parameterAccuracy": ratio(correct, total),
        "correctParams": correct,
        "totalParams": total,
        "cases": details,
        "note": "Свободные формулировки question/reason и value_schema (у нас answer_kind) "
        "исключены",
    }
