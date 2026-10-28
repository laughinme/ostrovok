import asyncio
from dataclasses import dataclass
from pathlib import Path

import yaml

from app.domain.partner.answers import AnswerInput, AnswerParser

_DESCRIPTIVE = frozenset({"conditions", "window_type", "notes"})


@dataclass(frozen=True, slots=True)
class AnswerMetrics:
    accepted: int
    exact_records: int
    exact_fields: int
    total_fields: int
    correct_clarifications: int
    total_ambiguous: int


async def evaluate_answers(parser: AnswerParser, path: Path) -> AnswerMetrics:
    accepted = records = fields = total = clarifications = ambiguous = 0
    raw = await asyncio.to_thread(path.read_text, encoding="utf-8")
    for case in yaml.safe_load(raw):
        parsed = await parser.parse(AnswerInput(case["question_key"], case["answer_text"]))
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
    return AnswerMetrics(accepted, records, fields, total, clarifications, ambiguous)
