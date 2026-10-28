from datetime import datetime
from typing import Any, Literal, Self

from app.api.schemas.base import ApiModel
from app.domain.agents import AgentKind, AgentRun, Planner, RunStatus, Step


class AgentStepOut(ApiModel):
    seq: int
    at: datetime
    kind: Literal["reason", "tool", "result", "decision", "error"]
    tool: str | None = None
    summary: str
    args: Any = None
    output: Any = None
    duration_ms: int | None = None

    @classmethod
    def from_domain(cls, s: Step) -> Self:
        return cls(
            seq=s.seq,
            at=s.at,
            kind=s.kind.value,
            tool=s.tool,
            summary=s.summary,
            args=s.args,
            output=s.output,
            duration_ms=s.duration_ms,
        )


class UsageOut(ApiModel):
    requests: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0
    cost_usd: float = 0.0


class AgentRunOut(ApiModel):
    id: str
    agent: AgentKind
    goal: str
    planner: Planner
    status: RunStatus
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    steps: list[AgentStepOut]
    usage: UsageOut | None = None
    subject: dict[str, Any] | None = None

    @classmethod
    def from_domain(cls, r: AgentRun) -> Self:
        return cls(
            id=str(r.id),
            agent=r.agent,
            goal=r.goal,
            planner=r.planner,
            status=r.status,
            created_at=r.created_at,
            started_at=r.started_at,
            finished_at=r.finished_at,
            steps=[AgentStepOut.from_domain(s) for s in r.steps],
            usage=UsageOut.model_validate(r.usage) if r.usage else None,
            subject=r.subject,
        )


class RunStarted(ApiModel):
    run_id: str
