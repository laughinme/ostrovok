from dataclasses import dataclass
from datetime import date, datetime
from typing import Any
from uuid import UUID

from app.core.errors import ErrorCode, NotFoundError
from app.domain.booking.status import BookingStatus


class BookingNotFoundError(NotFoundError):
    error_code = ErrorCode.BOOKING_NOT_FOUND
    default_detail = "Booking not found"


@dataclass(frozen=True, slots=True)
class BookingRequest:
    hotel_id: UUID
    room_type_id: str
    rate_plan_id: str
    check_in: date
    check_out: date
    adults: int
    children: int = 0
    request: str | None = None
    search_id: UUID | None = None


@dataclass(frozen=True, slots=True)
class Booking:
    id: UUID
    hotel_id: UUID
    room_type_id: str
    rate_plan_id: str
    check_in: date
    check_out: date
    adults: int
    children: int
    request: str
    status: BookingStatus
    hotel_reply: str | None
    price_demo: int
    promised: tuple[dict[str, Any], ...]


@dataclass(frozen=True, slots=True)
class Notification:
    id: UUID
    audience: str
    kind: str
    title: str
    body: str
    at: datetime
    read: bool
    link: str | None
