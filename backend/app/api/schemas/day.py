import datetime as dt
from typing import Self
from uuid import UUID

from app.api.schemas.base import ApiModel
from app.api.schemas.ground import LineStringOut, RouteOut
from app.api.schemas.knowledge import ScopeOut
from app.domain.geo.types import WalkProfile
from app.domain.knowledge.observation import DEM_ATTRIBUTION, OSM_ATTRIBUTION
from app.service.geo.day import DayPlan
from app.service.geo.day_places import DaySlot
from app.service.geo.routes import RouteView


class DayRouteOut(ApiModel):
    minutes: float
    back_minutes: float
    climb_m: float | None
    back_climb_m: float | None
    steps: int | None
    back_steps: int | None
    crossings: int | None
    back_crossings: int | None
    geometry: LineStringOut
    elevation_profile: tuple[tuple[float, float | None], ...]
    estimated: bool
    uncertain_share: float | None
    osm_refs: tuple[str, ...]

    @classmethod
    def from_view(cls, hotel_id: UUID, view: RouteView) -> Self:
        route = RouteOut.from_route(hotel_id, view, WalkProfile.WALK)
        return cls(
            minutes=route.there.minutes,
            back_minutes=route.back.minutes,
            climb_m=route.there.climb_m,
            back_climb_m=route.back.climb_m,
            steps=route.there.steps,
            back_steps=route.back.steps,
            crossings=route.there.crossings,
            back_crossings=route.back.crossings,
            geometry=route.geometry,
            elevation_profile=route.elevation_profile,
            estimated=route.estimated,
            uncertain_share=route.uncertain_share,
            osm_refs=route.osm_refs,
        )


class DaySlotOut(ApiModel):
    time: str
    title: str
    place: str | None = None
    osm_ref: str | None = None
    route: DayRouteOut | None = None
    unavailable_reason: str | None = None
    opening_hours: str | None = None

    @classmethod
    def from_slot(cls, hotel_id: UUID, slot: DaySlot) -> Self:
        return cls(
            time=slot.at.strftime("%H:%M"),
            title=slot.title,
            place=slot.place,
            osm_ref=slot.osm_ref,
            unavailable_reason=slot.unavailable_reason,
            opening_hours=slot.opening_hours,
            route=DayRouteOut.from_view(hotel_id, slot.route) if slot.route else None,
        )


class DaySunsetOut(ApiModel):
    time: str
    from_window: bool
    spot: str | None = None
    window_scope: ScopeOut | None = None


class DayPlanOut(ApiModel):
    hotel_id: UUID
    date: dt.date
    slots: list[DaySlotOut]
    sunset: DaySunsetOut
    attribution: str = f"{OSM_ATTRIBUTION}; {DEM_ATTRIBUTION}"
    caveats: tuple[str, ...]

    @classmethod
    def from_plan(cls, plan: DayPlan) -> Self:
        sunset = plan.sunset
        return cls(
            hotel_id=plan.hotel_id,
            date=plan.day,
            slots=[DaySlotOut.from_slot(plan.hotel_id, s) for s in plan.slots],
            sunset=DaySunsetOut(
                time=sunset.at.strftime("%H:%M"),
                from_window=sunset.from_window,
                spot=sunset.spot,
                window_scope=ScopeOut.from_domain(sunset.window_scope)
                if sunset.window_scope is not None
                else None,
            ),
            caveats=plan.caveats,
        )
