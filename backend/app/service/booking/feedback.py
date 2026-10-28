from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID

from sqlalchemy import select

from app.core.errors import ConflictError, DomainError
from app.db.models import TripFeedbackRow
from app.db.uow import UnitOfWork
from app.domain.booking.status import BookingStatus, transition
from app.domain.knowledge.observation import Evidence, EvidenceKind, Observation
from app.domain.knowledge.scope import scope_from_json
from app.domain.knowledge.sources import SourceKind
from app.service.booking.bookings import owned_booking
from app.service.knowledge.recorder import KnowledgeStore
from app.service.knowledge.registry import Registry
from app.service.ports import Clock


@dataclass(frozen=True, slots=True)
class FeedbackAnswer:
    fact_id: UUID
    answer: bool


class TripFeedback:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow, self._clock = uow, clock

    async def record(self, booking_id: UUID, user_id: UUID, answers: list[FeedbackAnswer]) -> None:
        row = await owned_booking(self._uow, booking_id, user_id)
        if row.status not in {BookingStatus.CONFIRMED, BookingStatus.COMPLETED}:
            transition(BookingStatus(row.status), BookingStatus.COMPLETED)
        if self._clock.now().date() < row.check_out:
            raise DomainError("Отзыв доступен после даты выезда")
        if not answers or len({a.fact_id for a in answers}) != len(answers):
            raise DomainError("Укажите непустой список ответов без повторов")
        promised = {UUID(p["factId"]): p for p in row.promised}
        old = set(
            (
                await self._uow.session.scalars(
                    select(TripFeedbackRow.fact_id).where(
                        TripFeedbackRow.booking_id == booking_id,
                    )
                )
            ).all()
        )
        observations = []
        for answer in answers:
            if answer.fact_id not in promised:
                raise DomainError("Факт не был обещан для этой брони")
            if answer.fact_id in old:
                raise ConflictError("Ответ по этому факту уже записан")
            p = promised[answer.fact_id]
            observations.append(await self._observation(row.hotel_id, booking_id, p, answer))
            self._uow.session.add(
                TripFeedbackRow(
                    booking_id=booking_id,
                    fact_id=answer.fact_id,
                    characteristic=p["characteristic"],
                    answer=answer.answer,
                )
            )
        await KnowledgeStore(self._uow, self._clock).record(observations, reason="guest.feedback")
        if row.status == BookingStatus.CONFIRMED:
            row.status = transition(BookingStatus(row.status), BookingStatus.COMPLETED)
        row.updated_at = self._clock.now()
        await self._uow.flush()

    async def _observation(
        self, hotel_id: UUID, booking_id: UUID, promised: dict[str, object], answer: FeedbackAnswer
    ) -> Observation:
        key = str(promised["characteristic"])
        characteristic = await Registry(self._uow).get(key)
        value = promised["value"]
        if not isinstance(value, bool):
            raise DomainError("Для отзыва выберите проверяемое утверждение с ответом да/нет")
        scope = promised["scope"]
        if not isinstance(scope, dict):
            raise DomainError("Область обещанного факта повреждена")
        return Observation(
            hotel_id=hotel_id,
            characteristic=key,
            characteristic_version=characteristic.version,
            scope=scope_from_json(scope),
            value=value if answer.answer else not value,
            confidence=1.0,
            source=SourceKind.GUEST,
            source_ref=f"trip:{booking_id}",
            method="guest.feedback",
            observed_at=self._clock.now(),
            valid_until=self._clock.now() + timedelta(days=characteristic.ttl_days),
            evidence=(
                Evidence(
                    EvidenceKind.TEXT,
                    "Ответ гостя после поездки",
                    "Гость",
                    {
                        "bookingId": str(booking_id),
                        "promisedFactId": str(answer.fact_id),
                        "matched": answer.answer,
                    },
                ),
            ),
        )
