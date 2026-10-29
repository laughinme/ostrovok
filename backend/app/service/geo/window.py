import asyncio
from collections import OrderedDict
from dataclasses import dataclass
from datetime import date
from math import isfinite
from uuid import UUID

from app.core.errors import DomainError, ErrorCode
from app.db.database import Database
from app.db.repositories.catalog import hotel_geo
from app.domain.catalog import HotelGeo
from app.domain.geo.horizon import evaluate_horizon
from app.domain.geo.panorama import WindowProfile
from app.domain.geo.peaks import VisiblePeak, visible_peaks
from app.domain.geo.scene import Obstacle
from app.domain.geo.sea import minimum_floor
from app.domain.geo.solar_visibility import SolarIntersection, solar_intersection
from app.domain.geo.sun import SunEvents, SunPosition, sun_events, sun_path
from app.domain.knowledge.scope import Facade
from app.infra.geo.window_profiles import WindowProfiles
from app.service.catalog.hotels import HotelNotFoundError
from app.service.geo.scenes import HotelScene, scene_cache
from app.service.recipes.executor import Environment, NoDataError
from app.service.recipes.methods.view import VIEW_ATTRIBUTION, VIEW_CAVEATS

_PANORAMA_CACHE_SIZE = 128


class WindowRequestError(DomainError):
    status_code = 422
    error_code = ErrorCode.INVALID_SCOPE


class WindowUnavailableError(DomainError):
    status_code = 503
    error_code = ErrorCode.HTTP_ERROR


@dataclass(frozen=True, slots=True)
class HorizonRay:
    azimuth_deg: float
    angle_deg: float | None
    kind: str
    sea_low_deg: float | None
    sea_high_deg: float | None


@dataclass(frozen=True, slots=True)
class WindowPanorama:
    hotel_id: UUID
    facade: Facade
    floor: int
    day: date
    horizon: tuple[HorizonRay, ...]
    peaks: tuple[VisiblePeak, ...]
    sun_path: tuple[SunPosition, ...]
    events: SunEvents
    disappearance: SolarIntersection | None
    appearance: SolarIntersection | None
    sea_fraction: float
    minimum_sea_floor: int | None
    attribution: str = VIEW_ATTRIBUTION
    caveats: tuple[str, ...] = VIEW_CAVEATS


class WindowQueries:
    def __init__(
        self,
        db: Database,
        env: Environment,
        profiles: WindowProfiles | None = None,
    ) -> None:
        self._db = db
        self._env = env
        self._profiles = profiles
        self._cache: OrderedDict[tuple[object, ...], WindowPanorama] = OrderedDict()

    async def get(self, hotel_id: UUID, facade: Facade, floor: int, day: date) -> WindowPanorama:
        async with self._db.unit_of_work() as uow:
            row = await uow.catalog.hotel(hotel_id)
            if row is None:
                raise HotelNotFoundError()
            hotel = hotel_geo(row)
        if facade not in hotel.facades or not 1 <= floor <= hotel.floors:
            raise WindowRequestError("Фасад или этаж отсутствует у отеля")
        if self._env.sea is None:
            raise WindowUnavailableError("Нет маски моря")
        profiles = self._profiles
        if profiles is not None:
            profile = profiles.get(hotel, facade, floor)
            if profile is not None:
                key = (hotel, facade, floor, day)
                if key not in self._cache:
                    self._cache[key] = await asyncio.to_thread(
                        _from_profile,
                        hotel,
                        facade,
                        floor,
                        day,
                        profile,
                    )
                self._cache.move_to_end(key)
                self._trim()
                return self._cache[key]
        try:
            scene = await scene_cache(self._env).get(hotel, self._env)
            return await self.panorama(scene, facade, floor, day)
        except NoDataError as error:
            raise WindowUnavailableError(str(error)) from error

    async def panorama(
        self, scene: HotelScene, facade: Facade, floor: int, day: date
    ) -> WindowPanorama:
        if facade not in scene.hotel.facades or not 1 <= floor <= scene.hotel.floors:
            raise WindowRequestError("Фасад или этаж отсутствует у отеля")
        key = (scene.cache_key, facade, floor, day)
        if key not in self._cache:
            self._cache[key] = await asyncio.to_thread(_panorama, scene, facade, floor, day)
        self._cache.move_to_end(key)
        self._trim()
        return self._cache[key]

    def invalidate(self) -> None:
        self._cache.clear()
        self._profiles = None
        scene_cache(self._env).clear()

    def _trim(self) -> None:
        while len(self._cache) > _PANORAMA_CACHE_SIZE:
            self._cache.popitem(last=False)


def _finite(value: float) -> float | None:
    return round(float(value), 4) if isfinite(value) else None


def _panorama(scene: HotelScene, facade: Facade, floor: int, day: date) -> WindowPanorama:
    windows = scene.prepare(facade)
    window = windows[1]
    eye = scene.eye(floor)
    horizon = evaluate_horizon(window, eye)
    profile = WindowProfile(
        window.azimuths_deg,
        horizon,
        visible_peaks(window, eye, scene.peaks),
        minimum_floor(windows, scene.base_m, scene.hotel.floors),
        eye,
    )
    return _from_profile(scene.hotel, facade, floor, day, profile)


def _from_profile(
    hotel: HotelGeo,
    facade: Facade,
    floor: int,
    day: date,
    profile: WindowProfile,
) -> WindowPanorama:
    horizon = profile.horizon
    eye = profile.eye_m
    rays = tuple(
        HorizonRay(
            float(azimuth % 360),
            _finite(angle),
            Obstacle(int(kind)).name.lower(),
            _finite(low),
            _finite(high),
        )
        for azimuth, angle, kind, low, high in zip(
            profile.azimuths_deg,
            horizon.angle_deg,
            horizon.kind,
            horizon.sea_low_deg,
            horizon.sea_high_deg,
            strict=True,
        )
    )
    return WindowPanorama(
        hotel_id=hotel.id,
        facade=facade,
        floor=floor,
        day=day,
        horizon=rays,
        peaks=profile.peaks,
        sun_path=sun_path(hotel.location, day),
        events=sun_events(hotel.location, day, eye_elevation_m=max(0, eye)),
        disappearance=solar_intersection(
            hotel.location, day, profile, horizon, event="sunset", eye_m=eye
        ),
        appearance=solar_intersection(
            hotel.location, day, profile, horizon, event="sunrise", eye_m=eye
        ),
        sea_fraction=horizon.sea_fraction,
        minimum_sea_floor=profile.minimum_sea_floor,
    )
