from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UuidPkMixin, utcnow


class SearchRow(UuidPkMixin, Base):
    __tablename__ = "searches"

    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    intent: Mapped[dict[str, Any]] = mapped_column(JSONB)
    result: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())


class BookingRow(UuidPkMixin, Base):
    __tablename__ = "bookings"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    hotel_id: Mapped[UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"), index=True)
    room_type_id: Mapped[str] = mapped_column(String(64))
    rate_plan_id: Mapped[str] = mapped_column(String(64))
    check_in: Mapped[date]
    check_out: Mapped[date]
    adults: Mapped[int]
    children: Mapped[int] = mapped_column(default=0, server_default="0")
    request: Mapped[str] = mapped_column(Text)
    promised: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(24))
    hotel_reply: Mapped[str | None] = mapped_column(Text)
    price_demo: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())


class TripFeedbackRow(UuidPkMixin, Base):
    __tablename__ = "trip_feedback"

    booking_id: Mapped[UUID] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"))
    fact_id: Mapped[UUID]
    characteristic: Mapped[str] = mapped_column(String(64))
    answer: Mapped[bool]
    created_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())


class TasteProfileRow(Base):
    __tablename__ = "taste_profiles"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    enabled: Mapped[bool] = mapped_column(default=True, server_default="true")
    overrides: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())


class UserEventRow(UuidPkMixin, Base):
    __tablename__ = "user_events"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    at: Mapped[datetime]


class QualityReportRow(UuidPkMixin, Base):
    __tablename__ = "quality_reports"

    report: Mapped[dict[str, Any]] = mapped_column(JSONB)
    generated_at: Mapped[datetime] = mapped_column(default=utcnow, server_default=func.now())
