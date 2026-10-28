from dataclasses import asdict
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks

from app.api.deps import ClockDep, EventsDep, SettingsDep, UowDep
from app.api.partner_deps import PartnerAccessDep, PartnerUserDep
from app.api.schemas.booking import BookingOut, NotificationOut
from app.api.schemas.knowledge import FactOut
from app.api.schemas.partner import (
    AnswerIn,
    AnswerOut,
    ChangedFactsOut,
    CorrectionIn,
    DecisionIn,
    DemandItemOut,
    DemandOut,
    FacadesIn,
    PartnerOverviewOut,
    QuestionOut,
)
from app.domain.booking.status import BookingStatus
from app.service.partner.answers import PartnerAnswers
from app.service.partner.catalog import PartnerCatalog
from app.service.partner.demand import PartnerDemand
from app.service.partner.events import publish_partner_facts
from app.service.partner.facades import PartnerFacades
from app.service.partner.facts import PartnerFacts
from app.service.partner.questions import PartnerQuestions
from app.service.partner.requests import PartnerRequests, hotel_notifications
from app.service.partner.simulation import schedule_simulation

router = APIRouter(prefix="/partner", tags=["Partner"])


@router.get("/hotels/{hotel_id}")
async def get_hotel(
    hotel_id: UUID, user: PartnerUserDep, access: PartnerAccessDep, uow: UowDep
) -> PartnerOverviewOut:
    await access.hotel(user.id, hotel_id)
    return PartnerOverviewOut.from_domain(await PartnerCatalog(uow).overview(hotel_id))


@router.get("/hotels/{hotel_id}/questions")
async def get_questions(
    hotel_id: UUID,
    user: PartnerUserDep,
    access: PartnerAccessDep,
    uow: UowDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> list[QuestionOut]:
    await access.hotel(user.id, hotel_id)
    questions = await PartnerQuestions(uow, clock).generate(hotel_id)
    if settings.hotelier_simulator == "on":
        await schedule_simulation(uow, clock, hotel_id, settings.simulator_delay_range)
    return [QuestionOut.from_domain(q) for q in questions]


@router.post("/questions/{question_id}/answers")
async def post_answer(
    question_id: UUID,
    payload: AnswerIn,
    user: PartnerUserDep,
    access: PartnerAccessDep,
    uow: UowDep,
    clock: ClockDep,
    events: EventsDep,
    background: BackgroundTasks,
) -> AnswerOut:
    await access.question(user.id, question_id)
    result = await PartnerAnswers(uow, clock).submit(
        question_id, text=payload.text, payload=payload.to_payload()
    )
    background.add_task(publish_partner_facts, events, result.changed)
    return AnswerOut.from_domain(result)


@router.put("/hotels/{hotel_id}/facades")
async def put_facades(
    hotel_id: UUID,
    payload: FacadesIn,
    user: PartnerUserDep,
    access: PartnerAccessDep,
    uow: UowDep,
    clock: ClockDep,
    events: EventsDep,
    background: BackgroundTasks,
) -> ChangedFactsOut:
    await access.hotel(user.id, hotel_id)
    result = await PartnerFacades(uow, clock).replace(
        hotel_id, [m.to_domain() for m in payload.mappings]
    )
    background.add_task(publish_partner_facts, events, result.changed_facts)
    return ChangedFactsOut(changed_facts=[FactOut.from_domain(f) for f in result.changed_facts])


@router.post("/facts/{fact_id}/confirm")
async def confirm_fact(
    fact_id: UUID,
    user: PartnerUserDep,
    access: PartnerAccessDep,
    uow: UowDep,
    clock: ClockDep,
    events: EventsDep,
    background: BackgroundTasks,
) -> ChangedFactsOut:
    await access.fact(user.id, fact_id)
    result = await PartnerFacts(uow, clock).confirm(fact_id)
    background.add_task(publish_partner_facts, events, result.changed_facts)
    return ChangedFactsOut(changed_facts=[FactOut.from_domain(f) for f in result.changed_facts])


@router.post("/facts/{fact_id}/correct")
async def correct_fact(
    fact_id: UUID,
    payload: CorrectionIn,
    user: PartnerUserDep,
    access: PartnerAccessDep,
    uow: UowDep,
    clock: ClockDep,
    events: EventsDep,
    background: BackgroundTasks,
) -> ChangedFactsOut:
    await access.fact(user.id, fact_id)
    result = await PartnerFacts(uow, clock).correct(
        fact_id,
        text=payload.text,
        payload=payload.to_payload(),
        scope=payload.scope.to_domain() if payload.scope else None,
    )
    background.add_task(publish_partner_facts, events, result.changed_facts)
    return ChangedFactsOut(changed_facts=[FactOut.from_domain(f) for f in result.changed_facts])


@router.get("/hotels/{hotel_id}/requests")
async def get_requests(
    hotel_id: UUID, user: PartnerUserDep, access: PartnerAccessDep, uow: UowDep, clock: ClockDep
) -> list[BookingOut]:
    await access.hotel(user.id, hotel_id)
    return [BookingOut.from_domain(b) for b in await PartnerRequests(uow, clock).of_hotel(hotel_id)]


@router.post("/requests/{booking_id}/decision")
async def decide_request(
    booking_id: UUID,
    payload: DecisionIn,
    user: PartnerUserDep,
    access: PartnerAccessDep,
    uow: UowDep,
    clock: ClockDep,
) -> BookingOut:
    await access.booking(user.id, booking_id)
    booking = await PartnerRequests(uow, clock).decide(
        booking_id, BookingStatus(payload.status), payload.reply
    )
    return BookingOut.from_domain(booking)


@router.get("/hotels/{hotel_id}/demand")
async def get_demand(
    hotel_id: UUID, user: PartnerUserDep, access: PartnerAccessDep, uow: UowDep, clock: ClockDep
) -> DemandOut:
    await access.hotel(user.id, hotel_id)
    hotel = await PartnerCatalog(uow).overview(hotel_id)
    counts = await PartnerDemand(uow, clock).weekly(hotel.hotel.geo.district)
    return DemandOut(
        hotel_id=hotel_id,
        district=hotel.hotel.geo.district,
        items=[DemandItemOut(characteristic=k, count=v) for k, v in sorted(counts.items())],
    )


@router.get("/hotels/{hotel_id}/notifications")
async def get_notifications(
    hotel_id: UUID, user: PartnerUserDep, access: PartnerAccessDep, uow: UowDep
) -> list[NotificationOut]:
    await access.hotel(user.id, hotel_id)
    return [NotificationOut(**asdict(n)) for n in await hotel_notifications(uow, hotel_id)]
