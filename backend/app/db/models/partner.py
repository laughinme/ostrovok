from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, Text, func
from sqlalchemy import text as sql_text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UuidPkMixin, utcnow


class HotelStaff(Base):
    __tablename__ = "hotel_staff"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    hotel_id: Mapped[UUID] = mapped_column(
        ForeignKey("hotels.id", ondelete="CASCADE"), primary_key=True
    )


class HotelierQuestion(UuidPkMixin, Base):
    __tablename__ = "hotelier_questions"

    hotel_id: Mapped[UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"), index=True)
    characteristic: Mapped[str] = mapped_column(String(64))
    text: Mapped[str] = mapped_column(Text)
    why: Mapped[str] = mapped_column(Text)
    value: Mapped[float]
    answer_kind: Mapped[str] = mapped_column(String(16))
    options: Mapped[list[str]] = mapped_column(JSONB, default=list)
    context: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    status: Mapped[str] = mapped_column(String(16), default="open", server_default="open")
    run_id: Mapped[UUID | None]
    created_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())
    answered_at: Mapped[datetime | None]

    __table_args__ = (
        Index(
            "uq_hotelier_questions_open",
            "hotel_id",
            "characteristic",
            unique=True,
            postgresql_where=sql_text("status = 'open'"),
        ),
    )


class HotelierAnswer(UuidPkMixin, Base):
    __tablename__ = "hotelier_answers"

    question_id: Mapped[UUID] = mapped_column(
        ForeignKey("hotelier_questions.id", ondelete="CASCADE"), index=True
    )
    hotel_id: Mapped[UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"))
    text: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    parsed: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    parse_confidence: Mapped[float]
    parser: Mapped[str] = mapped_column(String(8))
    author: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())


class NotificationRow(UuidPkMixin, Base):
    __tablename__ = "notifications"

    audience: Mapped[str] = mapped_column(String(16))
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    hotel_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("hotels.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String(255))
    read_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())


class DemandDaily(Base):
    __tablename__ = "demand_daily"

    day: Mapped[date] = mapped_column(primary_key=True)
    district: Mapped[str] = mapped_column(String(32), primary_key=True)
    characteristic: Mapped[str] = mapped_column(String(64), primary_key=True)
    count: Mapped[int] = mapped_column(default=0, server_default="0")
