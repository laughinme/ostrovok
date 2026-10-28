from dataclasses import dataclass
from datetime import date

from app.core.errors import DomainError, NotFoundError
from app.domain.catalog import HotelGeo
from app.domain.geo.climate import ClimateEstimate
from app.service.recipes.executor import Environment

MAX_TRIP_DAYS = 366


@dataclass(frozen=True, slots=True)
class TripClimate:
    estimate: ClimateEstimate
    station: str
    period: str


def hotel_climate(hotel: HotelGeo, env: Environment, start: date, end: date) -> TripClimate:
    if not 0 < (end - start).days <= MAX_TRIP_DAYS:
        raise DomainError("Даты поездки должны задавать от 1 до 366 ночей; to исключён")
    if env.climate is None:
        raise NotFoundError("Нет климатических норм региона")
    return TripClimate(
        env.climate.estimate(hotel.location, start, end),
        env.climate.nearest(hotel.location).ref,
        env.climate.period,
    )
