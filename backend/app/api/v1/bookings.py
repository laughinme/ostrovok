from dataclasses import asdict
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from app.api.deps import ClockDep, UowDep, require
from app.api.ground_deps import GroundQueriesDep
from app.api.schemas.booking import (
    BookingIn,
    BookingOut,
    FeedbackIn,
    NotificationOut,
    TripOut,
    TripSummaryOut,
)
from app.domain.users import CurrentUser, Permission
from app.service.booking.bookings import BookingService
from app.service.booking.feedback import FeedbackAnswer, TripFeedback
from app.service.booking.notifications import guest_notifications
from app.service.booking.trips import TripQueries, guest_trips

GuestDep = Annotated[CurrentUser, Depends(require(Permission.TRIPS))]
router = APIRouter(tags=["Trips"])


@router.post("/bookings", status_code=201)
async def create_booking(
    payload: BookingIn, user: GuestDep, uow: UowDep, clock: ClockDep
) -> BookingOut:
    return BookingOut.from_domain(
        await BookingService(uow, clock).create(user.id, payload.to_domain())
    )


@router.get("/me/trips")
async def my_trips(
    user: GuestDep, uow: UowDep, limit: Annotated[int, Query(ge=1, le=100)] = 50
) -> list[TripSummaryOut]:
    """The guest's booking requests, newest first, with the hotel name for the list."""
    return [TripSummaryOut.from_summary(t) for t in await guest_trips(uow, user.id, limit)]


@router.get("/trips/{booking_id}")
async def get_trip(
    booking_id: UUID, user: GuestDep, uow: UowDep, ground: GroundQueriesDep
) -> TripOut:
    return TripOut.from_trip(await TripQueries(uow, ground.env).get(booking_id, user.id))


@router.post("/trips/{booking_id}/feedback", status_code=204)
async def post_feedback(
    booking_id: UUID, payload: FeedbackIn, user: GuestDep, uow: UowDep, clock: ClockDep
) -> Response:
    await TripFeedback(uow, clock).record(
        booking_id, user.id, [FeedbackAnswer(a.fact_id, a.answer) for a in payload.answers]
    )
    return Response(status_code=204)


@router.get("/me/notifications")
async def notifications(user: GuestDep, uow: UowDep) -> list[NotificationOut]:
    return [NotificationOut(**asdict(n)) for n in await guest_notifications(uow, user.id)]
