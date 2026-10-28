from uuid import UUID

from fastapi import APIRouter

from app.api.deps import ClockDep, UowDep
from app.api.schemas.compare import CompareIn, CompareOut, SimilarIn, SimilarOut
from app.service.search.compare import ComparisonService
from app.service.search.similar import SimilarService

router = APIRouter(tags=["Search"])


@router.post("/compare")
async def compare_hotels(payload: CompareIn, uow: UowDep) -> CompareOut:
    return CompareOut.from_comparison(
        await ComparisonService(uow).compare(
            payload.intent(), [s.to_domain() for s in payload.selections]
        )
    )


@router.post("/hotels/{hotel_id}/similar")
async def similar_hotels(
    hotel_id: UUID, payload: SimilarIn, uow: UowDep, clock: ClockDep
) -> SimilarOut:
    return SimilarOut.from_similar(
        await SimilarService(uow, clock).find(hotel_id, payload.change, payload.intent())
    )
