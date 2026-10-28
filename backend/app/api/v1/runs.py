from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.api.deps import RunQueriesDep, RunStreamDep
from app.api.schemas.agents import AgentRunOut
from app.api.sse import sse_response

router = APIRouter(tags=["Agents"])


@router.get(
    path="/runs/{run_id}",
    summary="An agent run with its steps",
    responses={404: {"description": "Unknown run"}},
)
async def get_run(run_id: UUID, svc: RunQueriesDep) -> AgentRunOut:
    return AgentRunOut.from_domain(await svc.get(run_id))


@router.get(
    path="/runs/{run_id}/events",
    summary="Server-sent events: run.step for every step, then run.finished",
    response_class=StreamingResponse,
)
async def run_events(run_id: UUID, stream: RunStreamDep) -> StreamingResponse:
    return sse_response(stream.events(run_id))


@router.get(
    path="/events",
    summary="Server-sent events: fact.changed for hotels on screen, search.updated for a search",
    response_class=StreamingResponse,
)
async def hotel_events(
    stream: RunStreamDep,
    hotels: Annotated[list[UUID] | None, Query(description="Hotel ids; empty = all")] = None,
    search: Annotated[UUID | None, Query(description="Search id to watch")] = None,
) -> StreamingResponse:
    channels = [f"hotel:{h}" for h in hotels] if hotels else ["facts"]
    if search is not None:
        channels.append(f"search:{search}")
    return sse_response(stream.channel(channels))
