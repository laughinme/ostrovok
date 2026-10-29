from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UuidPkMixin, utcnow


class AgentRunRow(UuidPkMixin, Base):
    __tablename__ = "agent_runs"

    agent: Mapped[str] = mapped_column(String(16), index=True)
    goal: Mapped[str] = mapped_column(Text)
    planner: Mapped[str] = mapped_column(String(8))
    status: Mapped[str] = mapped_column(String(16))
    subject: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    usage: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    error: Mapped[str | None] = mapped_column(Text)
    parent_run_id: Mapped[UUID | None]
    created_at: Mapped[datetime] = mapped_column(
        default=utcnow, server_default=func.now(), index=True
    )
    started_at: Mapped[datetime | None]
    finished_at: Mapped[datetime | None]


class AgentStepRow(Base):
    __tablename__ = "agent_steps"

    run_id: Mapped[UUID] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="CASCADE"), primary_key=True
    )
    seq: Mapped[int] = mapped_column(primary_key=True)
    at: Mapped[datetime] = mapped_column(default=utcnow)
    kind: Mapped[str] = mapped_column(String(16))
    tool: Mapped[str | None] = mapped_column(String(64))
    summary: Mapped[str] = mapped_column(Text)
    args: Mapped[Any | None] = mapped_column(JSONB)
    output: Mapped[Any | None] = mapped_column(JSONB)
    duration_ms: Mapped[int | None]


class LlmCacheRow(Base):
    __tablename__ = "llm_cache"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    model: Mapped[str] = mapped_column(String(128))
    task: Mapped[str] = mapped_column(String(64))
    output: Mapped[dict[str, Any]] = mapped_column(JSONB)
    usage: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())


class LlmCallRow(UuidPkMixin, Base):
    __tablename__ = "llm_calls"

    created_at: Mapped[datetime] = mapped_column(
        default=utcnow, server_default=func.now(), index=True
    )
    task: Mapped[str] = mapped_column(String(64), index=True)
    model: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(16))
    prompt: Mapped[str] = mapped_column(Text)
    output: Mapped[Any | None] = mapped_column(JSONB)
    tool_calls: Mapped[list[Any]] = mapped_column(JSONB, default=list, server_default="[]")
    usage: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    cost_usd: Mapped[float] = mapped_column(default=0.0, server_default="0")
    latency_ms: Mapped[int] = mapped_column(default=0, server_default="0")
    error: Mapped[str | None] = mapped_column(Text)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[Any] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())
