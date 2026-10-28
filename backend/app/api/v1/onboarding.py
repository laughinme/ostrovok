from fastapi import APIRouter, Depends, status

from app.api.deps import ClockDep, SettingsDep, UowDep, require
from app.api.schemas.onboarding import OnboardRequest, OnboardStarted, ReserveHotelOut
from app.domain.users import Permission
from app.service.console.onboarding import HotelOnboarding

router = APIRouter(
    prefix="/console",
    tags=["Console"],
    dependencies=[Depends(require(Permission.CONSOLE_WRITE))],
)


@router.get(path="/hotels/reserve", summary="Real OSM hotels available for live research")
async def reserve(uow: UowDep, clock: ClockDep, settings: SettingsDep) -> list[ReserveHotelOut]:
    return [
        ReserveHotelOut(
            osm_id=h.osm_id, name=h.name, district=h.district, location=h.location, floors=h.floors
        )
        for h in await HotelOnboarding(uow, clock, settings.data_dir).reserve()
    ]


@router.post(
    path="/hotels",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Add and study a reserve OSM hotel",
)
async def onboard(
    payload: OnboardRequest, uow: UowDep, clock: ClockDep, settings: SettingsDep
) -> OnboardStarted:
    run_id, hotel_id = await HotelOnboarding(uow, clock, settings.data_dir).start(payload.osm_id)
    return OnboardStarted(run_id=run_id, hotel_id=hotel_id)
