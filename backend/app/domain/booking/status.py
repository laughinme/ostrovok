from enum import StrEnum

from app.core.errors import ConflictError, ErrorCode


class BookingStatus(StrEnum):
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    ALTERNATIVE_OFFERED = "alternative_offered"
    DECLINED = "declined"
    COMPLETED = "completed"


class InvalidBookingTransitionError(ConflictError):
    error_code = ErrorCode.INVALID_BOOKING_TRANSITION
    default_detail = "Invalid booking status transition"


_TRANSITIONS = {
    BookingStatus.REQUESTED: frozenset(
        {
            BookingStatus.CONFIRMED,
            BookingStatus.ALTERNATIVE_OFFERED,
            BookingStatus.DECLINED,
        }
    ),
    BookingStatus.ALTERNATIVE_OFFERED: frozenset({BookingStatus.CONFIRMED, BookingStatus.DECLINED}),
    BookingStatus.CONFIRMED: frozenset({BookingStatus.COMPLETED}),
    BookingStatus.DECLINED: frozenset(),
    BookingStatus.COMPLETED: frozenset(),
}


def transition(current: BookingStatus, target: BookingStatus) -> BookingStatus:
    if target not in _TRANSITIONS[current]:
        raise InvalidBookingTransitionError(f"Cannot move booking from {current} to {target}")
    return target
