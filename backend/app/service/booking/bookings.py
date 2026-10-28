from dataclasses import asdict, replace
from datetime import timedelta
from uuid import UUID, uuid4

from sqlalchemy import select

from app.core.errors import DomainError
from app.db.models import BookingRow, NotificationRow, RoomType, UserEventRow
from app.db.uow import UnitOfWork
from app.domain.booking.scope import intersection, trip_months
from app.domain.booking.status import BookingStatus, transition
from app.domain.jobs import JobKind, NewJob
from app.domain.knowledge.scope import Scope, scope_to_json
from app.domain.search.intent import Intent
from app.domain.search.score import Variant, best_match, request_text
from app.domain.search.trip import TripDraft
from app.service.booking.models import Booking, BookingNotFoundError, BookingRequest
from app.service.catalog.hotels import HotelNotFoundError
from app.service.knowledge.facts import FactQueries
from app.service.ports import Clock
from app.service.search.candidates import load_candidates, load_facts, with_room_variants
from app.service.search.search import SearchService, trip_window

MAX_NIGHTS = 366


def booking_view(row: BookingRow) -> Booking:
    return Booking(
        **{
            k: getattr(row, k)
            for k in Booking.__dataclass_fields__
            if k not in {"status", "promised"}
        },
        status=BookingStatus(row.status),
        promised=tuple(row.promised),
    )


async def owned_booking(uow: UnitOfWork, booking_id: UUID, user_id: UUID) -> BookingRow:
    row = await uow.session.scalar(
        select(BookingRow)
        .where(BookingRow.id == booking_id, BookingRow.user_id == user_id)
        .with_for_update()
    )
    if row is None:
        raise BookingNotFoundError()
    return row


class BookingService:
    def __init__(self, uow: UnitOfWork, clock: Clock) -> None:
        self._uow, self._clock = uow, clock

    async def create(self, user_id: UUID, request: BookingRequest) -> Booking:
        nights = (request.check_out - request.check_in).days
        if not 0 < nights <= MAX_NIGHTS or request.check_in < self._clock.now().date():
            raise DomainError("Выберите будущую поездку от 1 до 366 ночей")
        room = await self._uow.session.get(RoomType, request.room_type_id)
        if room is None or room.hotel_id != request.hotel_id:
            raise DomainError("Категория номера не принадлежит этому отелю")
        if (
            request.adults < 1
            or request.children < 0
            or request.adults + request.children > room.capacity
        ):
            raise DomainError("Число гостей превышает вместимость номера")
        rate = next((r for r in room.rates if r["id"] == request.rate_plan_id), None)
        if rate is None:
            raise DomainError("Тариф не принадлежит этой категории")
        variant = await self._variant(request)
        row = BookingRow(
            id=uuid4(),
            user_id=user_id,
            **{k: v for k, v in asdict(request).items() if k not in {"request", "search_id"}},
            request=request.request if request.request is not None else request_text(variant),
            status=BookingStatus.REQUESTED,
            hotel_reply=None,
            price_demo=int(rate.get("price", rate.get("priceDemo", 0))) * nights,
            promised=await self._promised(request.hotel_id, variant.scope),
        )
        self._uow.session.add(row)
        self._uow.session.add(
            UserEventRow(
                user_id=user_id,
                kind="booking_requested",
                at=self._clock.now(),
                payload={"bookingId": str(row.id), "scope": scope_to_json(variant.scope)},
            )
        )
        await self._uow.flush()
        await self._uow.jobs.enqueue(
            NewJob(
                JobKind.BOOKING_SIMULATE,
                {"booking_id": str(row.id)},
                dedupe_key=f"booking:{row.id}",
                delay=timedelta(seconds=10),
            ),
            now=self._clock.now(),
        )
        return booking_view(row)

    async def _variant(self, request: BookingRequest) -> Variant:
        intent = Intent(None, (), TripDraft(), ())
        if request.search_id:
            intent = await SearchService(self._uow, self._clock).intent(request.search_id)
        intent = replace(
            intent, trip=TripDraft(check_in=request.check_in, check_out=request.check_out)
        )
        hotels = await load_candidates(self._uow)
        hotel = next((h for h in hotels if h.id == request.hotel_id), None)
        if hotel is None:
            raise HotelNotFoundError()
        hotel = await with_room_variants(self._uow, hotel, request.room_type_id)
        variants = tuple(
            v for v in hotel.variants if v.room_type_id in (None, request.room_type_id)
        )
        if not variants:
            raise DomainError("Нет подходящей области для категории номера")
        facts = await load_facts(
            self._uow, [hotel.id], [c.characteristic for c in intent.chips if c.characteristic]
        )
        best = best_match(
            intent.chips,
            replace(hotel, variants=variants),
            facts.get(hotel.id, {}),
            trip_window(intent),
        )
        scope = replace(
            best.variant.scope,
            months=trip_months(request.check_in, request.check_out),
            room_types=frozenset({request.room_type_id}),
        )
        return replace(best.variant, scope=scope)

    async def _promised(self, hotel_id: UUID, scope: Scope) -> list[dict[str, object]]:
        result: list[dict[str, object]] = []
        for fact in await FactQueries(self._uow).of_hotel(hotel_id):
            overlap = intersection(scope, fact.scope)
            if overlap is not None:
                result.append(
                    {
                        "factId": str(fact.id),
                        "characteristic": fact.characteristic,
                        "statement": fact.statement,
                        "value": fact.value,
                        "confidence": fact.confidence,
                        "scope": scope_to_json(overlap),
                        "bookingScope": scope_to_json(scope),
                        "version": fact.version,
                    }
                )
        return result

    async def decide(self, booking_id: UUID, status: BookingStatus, reply: str) -> Booking:
        row = await self._uow.session.scalar(
            select(BookingRow).where(BookingRow.id == booking_id).with_for_update()
        )
        if row is None:
            raise BookingNotFoundError()
        row.status = transition(BookingStatus(row.status), status)
        row.hotel_reply, row.updated_at = reply, self._clock.now()
        self._uow.session.add(
            NotificationRow(
                audience="guest",
                user_id=row.user_id,
                hotel_id=row.hotel_id,
                kind="booking.status",
                title="Ответ отеля на ваш запрос",
                body=reply,
                link=f"/trips/{row.id}",
            )
        )
        await self._uow.flush()
        return booking_view(row)
