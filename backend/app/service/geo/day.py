"""A deterministic day around one hotel, with independently measured return walks."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from uuid import UUID

from app.domain.catalog import HotelGeo, MapFeature
from app.domain.geo.sun import MOSCOW
from app.service.geo.day_places import DaySlot, meal_candidates, pharmacy_candidates, place_slot
from app.service.geo.day_sunset import DaySunset, day_sunset
from app.service.geo.targets import route_targets
from app.service.recipes.executor import Environment

LOCAL_RADIUS_M = 2000
BREAKFAST_MINUTES = 30
MEAL_MINUTES = 60


@dataclass(frozen=True, slots=True)
class DayPlan:
    hotel_id: UUID
    day: date
    slots: tuple[DaySlot, ...]
    sunset: DaySunset
    caveats: tuple[str, ...] = (
        "Все маршруты считаются от отеля и обратно; время слота — прибытие",
        "Часы OSM могут устареть; отсутствие данных не означает, что заведение закрыто",
        "Вид заката — геометрическая модель без учёта облаков; купание не подразумевается",
    )


async def build_day(hotel: HotelGeo, env: Environment, day: date) -> DayPlan:
    features = await env.reader.tagged(
        {"amenity": ["cafe", "restaurant", "fast_food", "pharmacy"]},
        near=hotel.location,
        radius_m=LOCAL_RADIUS_M,
    )
    beaches = await route_targets(hotel, env, "beach")
    sunset = await day_sunset(hotel, env, day, beaches)
    dinner = max(_at(day, 19, 30), sunset.at + timedelta(minutes=MEAL_MINUTES))
    slots = _food_slots(hotel, env, features, day, dinner)
    slots.append(
        place_slot(
            hotel,
            env,
            beaches,
            _at(day, 10),
            "Утро у моря",
            missing="Морской пляж в пределах 40 минут пешком не найден",
        )
    )
    slots.append(_sunset_slot(sunset))
    slots.append(
        place_slot(
            hotel,
            env,
            pharmacy_candidates(features),
            max(_at(day, 22), dinner),
            "Аптека 24/7 на случай необходимости",
            missing="Доступная аптека 24/7 по OSM не подтверждена",
        )
    )
    return DayPlan(hotel.id, day, tuple(sorted(slots, key=lambda slot: slot.at)), sunset)


def _food_slots(
    hotel: HotelGeo, env: Environment, features: Sequence[MapFeature], day: date, dinner: datetime
) -> list[DaySlot]:
    visits = (
        (_at(day, 8, 30), "Кофе или завтрак", BREAKFAST_MINUTES, False),
        (_at(day, 13), "Обед", MEAL_MINUTES, False),
        (dinner, "Ужин допоздна", MEAL_MINUTES, True),
    )
    slots = []
    for at, title, stay, late in visits:
        candidates = meal_candidates(features, at, stay, late=late)
        missing = (
            "Не найден ресторан, открытый на ужин и в 23:30"
            if late
            else "Не найдено доступное место с подтверждёнными часами на время посещения"
        )
        slots.append(place_slot(hotel, env, candidates, at, title, missing=missing))
    return slots


def _at(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(day, time(hour, minute), MOSCOW)


def _sunset_slot(sunset: DaySunset) -> DaySlot:
    if sunset.from_window:
        return DaySlot(sunset.at, "Закат над морем из окна", place="Ваш номер на подходящем фасаде")
    if sunset.route is not None:
        return DaySlot(sunset.at, "Закат у моря", sunset.spot, sunset.osm_ref, sunset.route)
    return DaySlot(
        sunset.at,
        "Время заката",
        unavailable_reason="Не подтверждена доступная точка с закатом над морем",
    )
