from datetime import date
from typing import Literal, Self
from uuid import UUID

from app.api.schemas.base import ApiModel
from app.domain.geo.noise import NoiseEstimate
from app.domain.geo.types import WalkProfile
from app.domain.knowledge.observation import CLIMATE_ATTRIBUTION, DEM_ATTRIBUTION, OSM_ATTRIBUTION
from app.domain.knowledge.scope import Facade
from app.service.geo.climate import TripClimate
from app.service.geo.noise import HotelNoise
from app.service.geo.routes import RouteView


class NoiseSourceOut(ApiModel):
    osm_ref: str
    kind: str
    index_db: float
    distance_m: float
    screened: bool
    orientation_loss_db: float


class NoiseLevelOut(ApiModel):
    index_db: float | None
    category: str | None
    confidence: float
    sources: list[NoiseSourceOut]

    @classmethod
    def from_estimate(cls, estimate: NoiseEstimate) -> Self:
        return cls(
            index_db=estimate.index_db,
            category=estimate.category,
            confidence=estimate.confidence,
            sources=[
                NoiseSourceOut(
                    osm_ref=s.osm_ref,
                    kind=s.kind,
                    index_db=s.index_db,
                    distance_m=s.distance_m,
                    screened=s.screened,
                    orientation_loss_db=s.orientation_loss_db,
                )
                for s in estimate.sources
            ],
        )


class FacadeNoiseOut(ApiModel):
    facade: Facade
    day: NoiseLevelOut
    night: NoiseLevelOut


class NoiseOut(ApiModel):
    hotel_id: UUID
    facades: list[FacadeNoiseOut]
    unmodelled_refs: tuple[str, ...]
    completeness: float
    attribution: str = OSM_ATTRIBUTION
    caveats: tuple[str, ...] = ("Условный индекс по карте, не измеренный уровень шума",)

    @classmethod
    def from_noise(cls, hotel_id: UUID, noise: HotelNoise) -> Self:
        return cls(
            hotel_id=hotel_id,
            unmodelled_refs=noise.unmodelled_refs,
            completeness=noise.completeness,
            facades=[
                FacadeNoiseOut(
                    facade=f.facade,
                    day=NoiseLevelOut.from_estimate(f.day),
                    night=NoiseLevelOut.from_estimate(f.night),
                )
                for f in noise.facades
            ],
        )


class LineStringOut(ApiModel):
    type: Literal["LineString"] = "LineString"
    coordinates: tuple[tuple[float, float], ...]


class RouteLegOut(ApiModel):
    minutes: float
    length_m: float | None
    climb_m: float | None
    descent_m: float | None
    steps: int | None
    crossings: int | None


class RouteOut(ApiModel):
    hotel_id: UUID
    target_ref: str
    target_name: str | None
    profile: WalkProfile
    there: RouteLegOut
    back: RouteLegOut
    geometry: LineStringOut
    elevation_profile: tuple[tuple[float, float | None], ...]
    estimated: bool
    uncertain_share: float | None
    osm_refs: tuple[str, ...]
    attribution: str = f"{OSM_ATTRIBUTION}; {DEM_ATTRIBUTION}"
    caveats: tuple[str, ...]

    @classmethod
    def from_route(cls, hotel_id: UUID, view: RouteView, profile: WalkProfile) -> Self:
        walk, route = view.walk, view.walk.route
        there = RouteLegOut(
            minutes=walk.minutes,
            length_m=None,
            climb_m=walk.climb_m,
            descent_m=walk.back_climb_m,
            steps=None,
            crossings=None,
        )
        back = RouteLegOut(
            minutes=walk.back_minutes,
            length_m=None,
            climb_m=walk.back_climb_m,
            descent_m=walk.climb_m,
            steps=None,
            crossings=None,
        )
        if route is not None:
            there = RouteLegOut(**{k: getattr(route.there, k) for k in RouteLegOut.model_fields})
            back = RouteLegOut(**{k: getattr(route.back, k) for k in RouteLegOut.model_fields})
        return cls(
            hotel_id=hotel_id,
            target_ref=walk.feature.osm_id,
            target_name=walk.feature.name,
            profile=profile,
            there=there,
            back=back,
            geometry=LineStringOut(coordinates=view.coordinates),
            elevation_profile=view.elevation_profile,
            estimated=walk.estimated,
            uncertain_share=route.uncertain_share if route else None,
            osm_refs=route.osm_refs if route else (),
            caveats=("Оценка по прямой ×1,35; ступени и переходы неизвестны",)
            if walk.estimated
            else ("Доступность неизвестных участков не подтверждена",),
        )


class ClimateValuesOut(ApiModel):
    air_max_c: float | None = None
    air_min_c: float | None = None
    water_c: float | None = None
    sun_hours: float | None = None
    rain_days: float | None = None
    daylight_h: float | None = None


class ClimateOut(ApiModel):
    hotel_id: UUID
    check_in: date
    check_out: date
    days: int
    station: str
    period: str
    values: ClimateValuesOut
    coverage: ClimateValuesOut
    confidence: ClimateValuesOut
    month_days: dict[int, int]
    attribution: str = CLIMATE_ATTRIBUTION
    caveats: tuple[str, ...] = (
        "Климатические нормы, не прогноз погоды; to - дата выезда",
        "Воздух: 2016–2025; вода: полные месяцы 2023–2025, 2–3 года",
        "Солнце и световой день: ч/день; дождливые дни: норма за месяц; температура: °C",
    )

    @classmethod
    def from_climate(cls, hotel_id: UUID, climate: TripClimate) -> Self:
        estimate = climate.estimate
        return cls(
            hotel_id=hotel_id,
            check_in=estimate.check_in,
            check_out=estimate.check_out,
            days=estimate.days,
            station=climate.station,
            period=climate.period,
            values=ClimateValuesOut(**estimate.values),
            coverage=ClimateValuesOut(**estimate.coverage),
            confidence=ClimateValuesOut(**estimate.confidence),
            month_days=dict(estimate.month_days),
        )
