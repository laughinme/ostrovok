from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.schemas.window import WindowOut
from app.api.window_deps import WindowQueriesDep
from app.domain.knowledge.scope import Facade

router = APIRouter(tags=["Hotels"])


@router.get(
    path="/hotels/{hotel_id}/window",
    summary="Window horizon, peaks and the sun on a given date",
    responses={
        404: {"description": "Unknown hotel"},
        503: {"description": "Region data unavailable"},
    },
)
async def hotel_window(
    hotel_id: UUID,
    svc: WindowQueriesDep,
    facade: Facade,
    floor: Annotated[int, Query(ge=1)],
    day: Annotated[date, Query(alias="date")],
) -> WindowOut:
    return WindowOut.from_panorama(await svc.get(hotel_id, facade, floor, day))
