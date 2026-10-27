"""
Tool protocol (09 §5.2): one file per tool with a name, a description, a Pydantic args schema
and a typed result. The Researcher, the Curator's LLM planner and tests all see the same tool.
"""

from dataclasses import dataclass
from typing import Any, ClassVar, Protocol
from uuid import UUID

from pydantic import BaseModel


class StepSink(Protocol):
    """Where tools report what they did; the agent runtime writes it as a trace step."""

    async def tool(
        self, name: str, *, summary: str, args: Any = None, output: Any = None, duration_ms: int = 0
    ) -> None: ...


@dataclass(frozen=True, slots=True)
class ToolContext:
    run_id: UUID | None
    steps: StepSink


class Tool[A: BaseModel, R](Protocol):
    name: ClassVar[str]
    description: ClassVar[str]
    args_model: ClassVar[type[BaseModel]]

    async def __call__(self, args: A, ctx: ToolContext) -> R: ...
