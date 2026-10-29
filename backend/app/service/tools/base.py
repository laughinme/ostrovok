from dataclasses import dataclass
from typing import Any, ClassVar, Protocol
from uuid import UUID

from pydantic import BaseModel


class StepSink(Protocol):
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
