from dataclasses import replace
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import ClockDep, IntentParserDep, SearchServiceDep, rate_limit
from app.api.schemas.search import IntentModel, IntentRequest, SearchRequest, SearchResultOut
from app.domain.search.intent import Intent
from app.domain.search.trip import TripDraft

router = APIRouter(tags=["Search"])


@router.post(
    path="/intents",
    summary="Text → chips, trip and hints (called while the guest types)",
    dependencies=[Depends(rate_limit("intents"))],
)
async def parse_intent(
    payload: IntentRequest, parser: IntentParserDep, clock: ClockDep
) -> IntentModel:
    return IntentModel.from_domain(await parser.parse(payload.text, today=clock.now().date()))


@router.post(
    path="/searches",
    status_code=status.HTTP_201_CREATED,
    summary="Run a search: matches with verdicts, the room to ask for, relaxations",
)
async def create_search(
    payload: SearchRequest, parser: IntentParserDep, svc: SearchServiceDep, clock: ClockDep
) -> SearchResultOut:
    intent = Intent(text=payload.text, chips=(), trip=TripDraft(), hints=())
    if payload.text and payload.chips is None:
        intent = await parser.parse(payload.text, today=clock.now().date())
    if payload.chips is not None:
        intent = replace(intent, chips=tuple(c.to_domain() for c in payload.chips))
    if payload.trip is not None:
        intent = replace(intent, trip=payload.trip.to_domain())
    return SearchResultOut.from_view(await svc.search(intent))


@router.get(
    path="/searches/{search_id}",
    summary="Re-rank a stored search: shows facts learned since it was created",
    responses={404: {"description": "Unknown search"}},
)
async def get_search(search_id: UUID, svc: SearchServiceDep) -> SearchResultOut:
    return SearchResultOut.from_view(await svc.get(search_id))
