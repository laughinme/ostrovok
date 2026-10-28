from uuid import UUID

from app.db.models import BookingRow, HotelierQuestion, HotelStaff
from app.db.uow import UnitOfWork
from app.domain.partner.questions import ensure_staff_of
from app.service.booking.models import BookingNotFoundError
from app.service.knowledge.facts import FactQueries
from app.service.partner.questions import QuestionNotFoundError


class PartnerAccess:
    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def hotel(self, user_id: UUID, hotel_id: UUID) -> UUID:
        staff = await self._uow.session.get(HotelStaff, (user_id, hotel_id))
        ensure_staff_of(is_staff=staff is not None)
        return hotel_id

    async def question(self, user_id: UUID, question_id: UUID) -> UUID:
        row = await self._uow.session.get(HotelierQuestion, question_id)
        if row is None:
            raise QuestionNotFoundError()
        return await self.hotel(user_id, row.hotel_id)

    async def fact(self, user_id: UUID, fact_id: UUID) -> UUID:
        fact = (await FactQueries(self._uow).detail(fact_id)).fact
        return await self.hotel(user_id, fact.hotel_id)

    async def booking(self, user_id: UUID, booking_id: UUID) -> UUID:
        row = await self._uow.session.get(BookingRow, booking_id)
        if row is None:
            raise BookingNotFoundError()
        return await self.hotel(user_id, row.hotel_id)
