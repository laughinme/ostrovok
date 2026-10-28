from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from app.core.errors import ErrorCode, NotFoundError


class AgentKind(StrEnum):
    RESEARCHER = "researcher"
    CURATOR = "curator"
    LIAISON = "liaison"
    RECONCILER = "reconciler"
    WATCHER = "watcher"
    INTENT = "intent"
    MATCHER = "matcher"
    SIMULATOR = "simulator"


class Planner(StrEnum):
    LLM = "llm"
    RULES = "rules"


class RunStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class StepKind(StrEnum):
    """`reason → tool → result → decision` (09 §4.1); both planners write the same shape."""

    REASON = "reason"
    TOOL = "tool"
    RESULT = "result"
    DECISION = "decision"
    ERROR = "error"


@dataclass(frozen=True, slots=True)
class Step:
    seq: int
    at: datetime
    kind: StepKind
    summary: str
    tool: str | None = None
    args: Any = None
    output: Any = None
    duration_ms: int | None = None


@dataclass(frozen=True, slots=True)
class AgentRun:
    id: UUID
    agent: AgentKind
    goal: str
    planner: Planner
    status: RunStatus
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    steps: tuple[Step, ...] = ()
    usage: dict[str, float] | None = None
    subject: dict[str, Any] | None = None
    error: str | None = None


class RunNotFoundError(NotFoundError):
    error_code = ErrorCode.RUN_NOT_FOUND
    default_detail = "Agent run not found"
