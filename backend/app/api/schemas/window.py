from datetime import date, datetime
from typing import Literal, Self
from uuid import UUID

from app.api.schemas.base import ApiModel
from app.domain.geo.solar_visibility import SolarIntersection
from app.domain.geo.sun import SunPosition
from app.domain.knowledge.scope import Facade
from app.service.geo.window import WindowPanorama


class HorizonRayOut(ApiModel):
    azimuth_deg: float
    angle_deg: float | None
    kind: Literal["building", "terrain", "sea", "sky", "unknown"]
    sea_low_deg: float | None
    sea_high_deg: float | None


class PeakOut(ApiModel):
    ref: str
    name: str | None
    distance_m: float
    azimuth_deg: float
    elevation_deg: float


class SunPositionOut(ApiModel):
    at: datetime
    azimuth_deg: float
    elevation_deg: float

    @classmethod
    def from_position(cls, position: SunPosition) -> Self:
        return cls(
            at=position.at, azimuth_deg=position.azimuth_deg, elevation_deg=position.elevation_deg
        )


class SolarIntersectionOut(ApiModel):
    at: datetime
    behind: str

    @classmethod
    def from_intersection(cls, crossing: SolarIntersection | None) -> Self | None:
        return cls(at=crossing.position.at, behind=crossing.behind) if crossing else None


class WindowOut(ApiModel):
    hotel_id: UUID
    facade: Facade
    floor: int
    date: date
    horizon: list[HorizonRayOut]
    peaks: list[PeakOut]
    sun_path: list[SunPositionOut]
    sunrise: SunPositionOut
    sunset: SunPositionOut
    disappearance: SolarIntersectionOut | None
    appearance: SolarIntersectionOut | None
    sea_fraction: float
    minimum_sea_floor: int | None
    timezone: str = "Europe/Moscow"
    attribution: str
    caveats: tuple[str, ...]

    @classmethod
    def from_panorama(cls, panorama: WindowPanorama) -> Self:
        return cls(
            hotel_id=panorama.hotel_id,
            facade=panorama.facade,
            floor=panorama.floor,
            date=panorama.day,
            horizon=[
                HorizonRayOut.model_validate(r, from_attributes=True) for r in panorama.horizon
            ],
            peaks=[PeakOut.model_validate(p, from_attributes=True) for p in panorama.peaks],
            sun_path=[SunPositionOut.from_position(p) for p in panorama.sun_path],
            sunrise=SunPositionOut.from_position(panorama.events.sunrise),
            sunset=SunPositionOut.from_position(panorama.events.sunset),
            disappearance=SolarIntersectionOut.from_intersection(panorama.disappearance),
            appearance=SolarIntersectionOut.from_intersection(panorama.appearance),
            sea_fraction=panorama.sea_fraction,
            minimum_sea_floor=panorama.minimum_sea_floor,
            attribution=panorama.attribution,
            caveats=panorama.caveats,
        )
