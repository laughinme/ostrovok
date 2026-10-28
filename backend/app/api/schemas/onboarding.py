from uuid import UUID

from pydantic import Field

from app.api.schemas.base import ApiModel


class OnboardRequest(ApiModel):
    osm_id: str = Field(pattern=r"^(node|way|relation)/[1-9][0-9]*$", max_length=32)


class OnboardStarted(ApiModel):
    run_id: UUID
    hotel_id: UUID


class ReserveHotelOut(ApiModel):
    osm_id: str
    name: str
    district: str
    location: tuple[float, float]
    floors: int
