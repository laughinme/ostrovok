from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any, Protocol

from app.domain.knowledge.scope import Scope


@dataclass(frozen=True, slots=True)
class AnswerInput:
    characteristic: str
    text: str = ""
    payload: Mapping[str, Any] = field(default_factory=dict)
    room_names: tuple[str, ...] = ()
    options: tuple[str, ...] = ()
    value_type: str = "probability"
    unit: str | None = None
    question: str = ""


@dataclass(frozen=True, slots=True)
class ParsedAnswer:
    fields: Mapping[str, Any]
    value: Any
    confidence: float
    scope: Scope = field(default_factory=Scope)
    parser: str = "rules"

    @property
    def needs_clarification(self) -> bool:
        return self.confidence < 0.6


class AnswerParser(Protocol):
    async def parse(self, answer: AnswerInput) -> ParsedAnswer: ...
