from fastapi import APIRouter, Response

from app.api.deps import ClockDep, UowDep
from app.api.schemas.taste import TastePatch, TasteProfileOut
from app.api.v1.bookings import GuestDep
from app.core.errors import DomainError
from app.service.search.taste import TasteService

router = APIRouter(prefix="/me/taste", tags=["Taste"])


@router.get("")
async def get_taste(user: GuestDep, uow: UowDep, clock: ClockDep) -> TasteProfileOut:
    return TasteProfileOut.from_domain(await TasteService(uow, clock).get(user.id))


@router.patch("")
async def patch_taste(
    payload: TastePatch, user: GuestDep, uow: UowDep, clock: ClockDep
) -> TasteProfileOut:
    weights = (
        {w.characteristic: w.weight for w in payload.weights}
        if payload.weights is not None
        else None
    )
    if payload.weights and weights is not None and len(payload.weights) != len(weights):
        raise DomainError("Характеристика повторяется в списке весов")
    return TasteProfileOut.from_domain(
        await TasteService(uow, clock).patch(user.id, enabled=payload.enabled, weights=weights)
    )


@router.delete("", status_code=204)
async def reset_taste(user: GuestDep, uow: UowDep, clock: ClockDep) -> Response:
    await TasteService(uow, clock).reset(user.id)
    return Response(status_code=204)
