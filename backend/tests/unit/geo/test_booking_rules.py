from datetime import date

import pytest

from app.domain.booking.scope import intersection, trip_months
from app.domain.booking.status import BookingStatus, InvalidBookingTransitionError, transition
from app.domain.knowledge.scope import Facade, Scope


@pytest.mark.parametrize(
    "target", [BookingStatus.CONFIRMED, BookingStatus.ALTERNATIVE_OFFERED, BookingStatus.DECLINED]
)
def test_hotel_can_decide_requested_booking(target: BookingStatus) -> None:
    assert transition(BookingStatus.REQUESTED, target) is target


@pytest.mark.parametrize(
    ("current", "target"),
    [
        (BookingStatus.REQUESTED, BookingStatus.COMPLETED),
        (BookingStatus.DECLINED, BookingStatus.COMPLETED),
        (BookingStatus.COMPLETED, BookingStatus.CONFIRMED),
        (BookingStatus.CONFIRMED, BookingStatus.DECLINED),
    ],
)
def test_terminal_and_unconfirmed_bookings_cannot_complete(
    current: BookingStatus, target: BookingStatus
) -> None:
    with pytest.raises(InvalidBookingTransitionError) as exc:
        transition(current, target)
    assert exc.value.error_code == "INVALID_BOOKING_TRANSITION"


def test_trip_months_excludes_checkout_and_handles_year_boundary() -> None:
    assert trip_months(date(2026, 11, 29), date(2026, 12, 1)) == {11}
    assert trip_months(date(2026, 12, 31), date(2027, 1, 2)) == {12, 1}


def test_promised_scope_is_limited_to_booked_area() -> None:
    booking = Scope(
        facades=frozenset({Facade.S}),
        floor_from=4,
        floor_to=6,
        months=frozenset({11}),
        room_types=frozenset({"suite"}),
    )
    fact = Scope(facades=frozenset({Facade.S, Facade.W}), floor_from=2, floor_to=5)
    overlap = intersection(booking, fact)
    assert overlap is not None
    assert overlap.facades == {Facade.S}
    assert (overlap.floor_from, overlap.floor_to) == (4, 5)
    assert overlap.months == {11}
    assert overlap.room_types == {"suite"}
    assert intersection(booking, Scope(months=frozenset({6}))) is None
    assert intersection(booking, Scope(facades=frozenset({Facade.N}))) is None
    assert intersection(booking, Scope(room_types=frozenset({"standard"}))) is None
