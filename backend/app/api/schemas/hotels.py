from typing import Any, Self

from pydantic import Field

from app.api.schemas.base import ApiModel
from app.api.schemas.knowledge import FactOut
from app.domain.catalog import Nearby
from app.domain.knowledge.scope import Facade
from app.service.catalog.hotels import HotelView, RoomView


class RatePlanOut(ApiModel):
    id: str
    meal: str
    cancel: str
    pay: str
    price_demo: int
    tag: str | None = None

    @classmethod
    def from_raw(cls, raw: dict[str, Any]) -> Self:
        return cls(
            id=str(raw.get("id", "")),
            meal=str(raw.get("meal", "")),
            cancel=str(raw.get("cancel", "")),
            pay=str(raw.get("pay", "")),
            price_demo=int(raw.get("price", raw.get("priceDemo", 0))),
            tag=raw.get("tag"),
        )


class RoomTypeOut(ApiModel):
    id: str
    name: str
    area: float
    bed: str
    capacity: int
    facades: list[Facade]
    floors: tuple[int, int] | None = None
    confirmed_by_hotel: bool
    rates: list[RatePlanOut]

    @classmethod
    def from_view(cls, r: RoomView) -> Self:
        return cls(
            id=r.id,
            name=r.name,
            area=r.area,
            bed=r.bed,
            capacity=r.capacity,
            facades=[Facade(f) for f in r.facades],
            floors=r.floors,
            confirmed_by_hotel=r.confirmed_by_hotel,
            rates=[RatePlanOut.from_raw(rate) for rate in r.rates],
        )


class HotelDemoOut(ApiModel):
    rating: float
    rating_label: str
    tagline: str
    amenities: list[str]

    @classmethod
    def from_raw(cls, raw: dict[str, Any]) -> Self:
        return cls(
            rating=float(raw.get("rating", 0)),
            rating_label=str(raw.get("ratingLabel", raw.get("rating_label", ""))),
            tagline=str(raw.get("tagline", "")),
            amenities=list(raw.get("amenities", [])),
        )


class UnknownOut(ApiModel):
    characteristic: str
    question: str
    why: str


_KM = 1000


class NearbyOut(ApiModel):
    kind: str = Field(
        ..., description="beach | food | grocery | pharmacy | park | playground | station"
    )
    title: str = Field(..., description="What it is, in Russian: «Пляж», «Аптека»")
    name: str = Field(..., description="The OSM name, or the title when the place has none")
    distance_m: int = Field(..., description="Straight-line distance from the hotel")
    distance_text: str = Field(..., description="«350 м по прямой», «1,2 км по прямой»")
    osm_ref: str | None = None
    location: tuple[float, float] = Field(..., description="lon, lat")

    @classmethod
    def from_domain(cls, place: Nearby) -> Self:
        return cls(
            kind=place.kind,
            title=place.title,
            name=place.name or place.title,
            distance_m=round(place.distance_m),
            distance_text=_distance_text(place.distance_m),
            osm_ref=place.osm_ref,
            location=(place.location.lon, place.location.lat),
        )


def _distance_text(metres: float) -> str:
    if metres < _KM:
        return f"{max(10, round(metres, -1)):.0f} м по прямой"
    return f"{metres / _KM:.1f} км по прямой".replace(".", ",")


class HotelOut(ApiModel):
    id: str
    osm_id: str
    name: str
    stars: int | None = None
    area: str
    address: str
    location: tuple[float, float] = Field(..., description="lon, lat")
    floors: int
    facades: list[Facade]
    demo: HotelDemoOut
    price_from_demo: int | None = None
    rooms: list[RoomTypeOut]
    facts: list[FactOut]
    unknowns: list[UnknownOut]
    nearby: list[NearbyOut]

    @classmethod
    def from_view(cls, h: HotelView) -> Self:
        return cls(
            id=str(h.geo.id),
            osm_id=h.geo.osm_id,
            name=h.geo.name,
            stars=h.stars,
            area=h.area,
            address=h.address,
            location=(h.geo.location.lon, h.geo.location.lat),
            floors=h.geo.floors,
            facades=list(h.geo.facades),
            demo=HotelDemoOut.from_raw(h.demo),
            price_from_demo=h.price_from_demo,
            rooms=[RoomTypeOut.from_view(r) for r in h.rooms],
            facts=[FactOut.from_domain(f) for f in h.facts],
            unknowns=[
                UnknownOut(characteristic=u.characteristic, question=u.question, why=u.why)
                for u in h.unknowns
            ],
            nearby=[NearbyOut.from_domain(p) for p in h.nearby],
        )
