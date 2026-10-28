from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import ClockDep, SettingsDep, UowDep
from app.api.schemas.moods import MoodOut
from app.service.search.moods import MoodQueries

router = APIRouter(tags=["Search"])


@router.get(
    path="/moods",
    summary="Saved wishes with live hotel counts for a month (current month by default)",
    description=(
        "Counts require every chip to have probability ≥0.7 in one compatible room variant. "
        "Unknown, expired, stale and conflicting facts do not count. "
        "Pass chips and trip.month to POST /searches to open a collection."
    ),
)
async def moods(
    uow: UowDep,
    clock: ClockDep,
    settings: SettingsDep,
    month: Annotated[int | None, Query(ge=1, le=12)] = None,
) -> list[MoodOut]:
    selected = month or clock.now().month
    values = await MoodQueries(uow, clock, settings.data_dir).all(month=selected)
    return [MoodOut.from_domain(value, selected) for value in values]
