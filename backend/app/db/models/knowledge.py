from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UuidPkMixin, utcnow


class CharacteristicRow(Base):
    __tablename__ = "characteristics"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    version: Mapped[int] = mapped_column(default=1, server_default="1")
    status: Mapped[str] = mapped_column(String(16))
    definition: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())


class ObservationRow(Base):
    __tablename__ = "observations"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    hotel_id: Mapped[UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"))
    characteristic: Mapped[str] = mapped_column(String(64))
    characteristic_version: Mapped[int]
    scope: Mapped[dict[str, Any]] = mapped_column(JSONB)
    scope_key: Mapped[str] = mapped_column(String(255))
    value: Mapped[Any] = mapped_column(JSONB)
    confidence: Mapped[float]
    source: Mapped[str] = mapped_column(String(16))
    source_ref: Mapped[str] = mapped_column(String(255))
    method: Mapped[str] = mapped_column(Text)
    evidence: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    caveats: Mapped[list[str]] = mapped_column(JSONB, default=list)
    observed_at: Mapped[datetime]
    valid_until: Mapped[datetime | None]
    run_id: Mapped[UUID | None]
    is_demo: Mapped[bool] = mapped_column(default=False, server_default="false")
    superseded_at: Mapped[datetime | None]

    __table_args__ = (Index("ix_observations_pair", "hotel_id", "characteristic", "observed_at"),)


class FactRow(Base):
    __tablename__ = "facts"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    hotel_id: Mapped[UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"))
    characteristic: Mapped[str] = mapped_column(String(64), index=True)
    scope: Mapped[dict[str, Any]] = mapped_column(JSONB)
    scope_key: Mapped[str] = mapped_column(String(255))
    value: Mapped[Any] = mapped_column(JSONB)
    confidence: Mapped[float]
    statement: Mapped[str] = mapped_column(Text)
    scope_text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16))
    source: Mapped[str] = mapped_column(String(16))
    source_label: Mapped[str] = mapped_column(String(128))
    method: Mapped[str] = mapped_column(Text)
    observed_at: Mapped[datetime]
    valid_until: Mapped[datetime | None]
    evidence: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    caveats: Mapped[list[str]] = mapped_column(JSONB, default=list)
    observation_ids: Mapped[list[UUID]] = mapped_column(ARRAY(Uuid()), default=list)
    conflict_id: Mapped[UUID | None]
    is_demo: Mapped[bool] = mapped_column(default=False, server_default="false")
    version: Mapped[int] = mapped_column(default=1, server_default="1")
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())

    __table_args__ = (UniqueConstraint("hotel_id", "characteristic", "scope_key"),)


class FactVersionRow(UuidPkMixin, Base):
    __tablename__ = "fact_versions"

    fact_id: Mapped[UUID] = mapped_column(index=True)
    hotel_id: Mapped[UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"))
    characteristic: Mapped[str] = mapped_column(String(64))
    scope_key: Mapped[str] = mapped_column(String(255))
    version: Mapped[int]
    statement: Mapped[str] = mapped_column(Text)
    value: Mapped[Any] = mapped_column(JSONB)
    confidence: Mapped[float]
    reason: Mapped[str] = mapped_column(Text)
    run_id: Mapped[UUID | None]
    at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())

    __table_args__ = (Index("ix_fact_versions_pair", "hotel_id", "characteristic"),)


class ConflictRow(UuidPkMixin, Base):
    __tablename__ = "conflicts"

    hotel_id: Mapped[UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"))
    characteristic: Mapped[str] = mapped_column(String(64))
    claims: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    rule: Mapped[str] = mapped_column(String(16))
    resolution: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16))
    cells: Mapped[int] = mapped_column(default=0, server_default="0")
    question_id: Mapped[UUID | None]
    created_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())
    resolved_at: Mapped[datetime | None]

    __table_args__ = (Index("ix_conflicts_pair", "hotel_id", "characteristic"),)
