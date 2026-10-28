import asyncio
from dataclasses import dataclass
from pathlib import Path

import yaml

from app.domain.partner.answers import AnswerInput, AnswerParser, ParsedAnswer

_DESCRIPTIVE = frozenset({"conditions", "window_type", "notes"})


@dataclass(frozen=True, slots=True)
class AnswerMetrics:
    requested: int
    evaluated: int
    rules_results: int
    accepted: int
    exact_records: int
    exact_fields: int
    total_fields: int
    correct_clarifications: int
    total_ambiguous: int


async def evaluate_answers(
    parser: AnswerParser, path: Path, *, require_llm: bool = False
) -> AnswerMetrics:
    accepted = records = fields = total = clarifications = ambiguous = 0
    raw = await asyncio.to_thread(path.read_text, encoding="utf-8")
    cases = yaml.safe_load(raw)
    evaluated = fallbacks = 0
    gate = asyncio.Semaphore(4 if require_llm else 1)

    async def parse(key: str, text: str) -> ParsedAnswer:
        async with gate:
            return await parser.parse(AnswerInput(key, text))

    results = await asyncio.gather(*(parse(c["question_key"], c["answer_text"]) for c in cases))
    for case, parsed in zip(cases, results, strict=True):
        fallbacks += parsed.parser != "llm"
        if require_llm and parsed.parser != "llm":
            continue
        evaluated += 1
        if case["clarity"] == "low":
            ambiguous += 1
            clarifications += parsed.needs_clarification
            continue
        accepted += not parsed.needs_clarification
        correct = 0
        machine = {k: v for k, v in case["expected"].items() if k not in _DESCRIPTIVE}
        for key, expected in machine.items():
            actual = parsed.fields.get(key)
            correct += (
                (not actual) if key == "room_types" and expected == "all" else actual == expected
            )
        records += correct == len(machine) and not parsed.needs_clarification
        fields += correct
        total += len(machine)
    return AnswerMetrics(
        len(cases),
        evaluated,
        fallbacks,
        accepted,
        records,
        fields,
        total,
        clarifications,
        ambiguous,
    )
