from dataclasses import replace
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import ClockDep, IntentParserDep, SearchServiceDep, UowDep, rate_limit
from app.api.guest_deps import OptionalGuestDep
from app.api.schemas.agents import RunStarted
from app.api.schemas.search import (
    IntentModel,
    IntentRequest,
    ResearchRequest,
    SearchRequest,
    SearchResultOut,
    WishStarted,
)
from app.domain.search.intent import Intent
from app.domain.search.trip import TripDraft
from app.service.agents.wishes import RESEARCH_TOP, add_wishes, start_wish_research
from app.service.search.search import SearchNotFoundError

router = APIRouter(tags=["Search"])


@router.post(
    path="/intents",
    summary="Text → chips, trip and hints (called while the guest types)",
    description="`planner=rules` answers in milliseconds: call it on every keystroke and the "
    "default (LLM when configured, 1–3 s) when the guest pauses or submits.",
    dependencies=[Depends(rate_limit("intents"))],
)
async def parse_intent(
    payload: IntentRequest,
    parser: IntentParserDep,
    clock: ClockDep,
    planner: Annotated[Literal["auto", "rules"], Query()] = "auto",
) -> IntentModel:
    intent = await parser.parse(payload.text, today=clock.now().date(), llm=planner == "auto")
    return IntentModel.from_domain(intent)


@router.post(
    path="/searches",
    status_code=status.HTTP_201_CREATED,
    summary="Run a search: matches with verdicts, the room to ask for, relaxations",
)
async def create_search(
    payload: SearchRequest,
    parser: IntentParserDep,
    svc: SearchServiceDep,
    clock: ClockDep,
    user: OptionalGuestDep,
) -> SearchResultOut:
    intent = Intent(text=payload.text, chips=(), trip=TripDraft(), hints=())
    if payload.text and payload.chips is None:
        intent = await parser.parse(payload.text, today=clock.now().date())
    if payload.chips is not None:
        intent = replace(intent, chips=tuple(c.to_domain() for c in payload.chips))
    if payload.trip is not None:
        intent = replace(intent, trip=payload.trip.to_domain())
    return SearchResultOut.from_view(
        await svc.search(intent, user_id=user.id if user else None, use_profile=payload.use_profile)
    )


@router.get(
    path="/searches/{search_id}",
    summary="Re-rank a stored search: shows facts learned since it was created",
    responses={404: {"description": "Unknown search"}},
)
async def get_search(search_id: UUID, svc: SearchServiceDep) -> SearchResultOut:
    return SearchResultOut.from_view(await svc.get(search_id))


@router.post(
    path="/searches/{search_id}/wishes",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Add a wish in words; unknown ones start live research (run id in the answer)",
    responses={404: {"description": "Unknown search"}},
)
async def add_wish(
    search_id: UUID,
    payload: IntentRequest,
    parser: IntentParserDep,
    svc: SearchServiceDep,
    uow: UowDep,
    clock: ClockDep,
) -> WishStarted:
    new = await parser.parse(payload.text, today=clock.now().date())
    run_id, _ = await add_wishes(svc, uow, clock, search_id, new)
    return WishStarted(
        run_id=str(run_id) if run_id else None,
        search=SearchResultOut.from_view(await svc.get(search_id)),
    )


@router.post(
    path="/searches/{search_id}/research",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Research an unknown chip for the top hotels now («узнать вживую»)",
)
async def research_chip(
    search_id: UUID, payload: ResearchRequest, svc: SearchServiceDep, uow: UowDep, clock: ClockDep
) -> RunStarted:
    view = await svc.get(search_id)
    chip = next((c for c in view.intent.chips if c.id == payload.chip_id), None)
    if chip is None:
        raise SearchNotFoundError("No such chip in this search")
    top = [m.hotel.id for m in view.ranking.matches[:RESEARCH_TOP]]
    run_id = await start_wish_research(uow, clock, search_id, [chip], top)
    return RunStarted(run_id=str(run_id))
