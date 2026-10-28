from dataclasses import dataclass
from typing import Protocol

from app.core.errors import DomainError, ErrorCode
from app.domain.geo.types import LonLat


@dataclass(frozen=True, slots=True)
class Place:
    ref: str
    name: str
    address: str
    location: tuple[float, float]


class Geocoder(Protocol):
    async def search(self, query: str, near: LonLat) -> list[Place]: ...


class GeocodingUnavailableError(DomainError):
    status_code = 503
    error_code = ErrorCode.HTTP_ERROR
    default_detail = "Поиск адресов временно недоступен. Выберите место рядом или попробуйте позже."
