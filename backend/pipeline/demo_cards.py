"""Deterministic fictional room categories and rates, based on the R6 ranges."""

import hashlib
from pathlib import Path
from random import Random
from typing import Any

import yaml

SEED = 20261028
REFERENCE = Path(__file__).with_name("demo_reference.yaml")
AMENITIES = {
    "wifi": "Wi-Fi",
    "pool": "Бассейн",
    "parking": "Парковка",
    "breakfast": "Завтрак",
    "air_conditioning": "Кондиционер",
    "spa": "Спа",
    "kids_club": "Детский клуб",
    "hotel_beach": "Пляжная зона отеля",
    "transfer": "Трансфер по запросу",
}
TAGLINES = {
    "center": "Городской отдых в центре Сочи · демо",
    "khosta": "Отпуск в Хосте · демо",
    "adler": "Курортная поездка в Адлер · демо",
    "sirius": "Отдых в Сириусе · демо",
    "krasnaya_polyana": "Поездка в горы · демо",
}


def hotel_random(osm_id: str, seed: int = SEED, *, stream: str = "cards") -> Random:
    """Independent per-hotel streams keep existing cards stable when the catalog grows."""
    digest = hashlib.sha256(f"{seed}:{stream}:{osm_id}".encode()).digest()
    return Random(int.from_bytes(digest))  # noqa: S311 - reproducible fictional data, not secrets


def template_type(hotel: dict[str, str]) -> str:
    if hotel["tourism"] == "guest_house":
        return "guesthouse"
    if hotel["tourism"] == "apartment":
        return "apartments"
    stars = hotel["stars"] if hotel["stars"] in {"2", "3", "4", "5"} else "3"
    return f"hotel_{stars}_star"


def chance(rng: Random, interval: list[int]) -> bool:
    return rng.random() * 100 < rng.uniform(*interval)


def rates(room_id: str, price: int, *, breakfast: bool) -> list[dict[str, Any]]:
    return [
        {
            "id": f"{room_id}:flex",
            "meal": "Питание не включено",
            "cancel": "Бесплатная отмена за 48 часов до заезда · демо",
            "pay": "При заезде",
            "price": price,
            "tag": "Гибкий тариф · демо",
            "isDemo": True,
        },
        {
            "id": f"{room_id}:prepay",
            "meal": "Завтрак включён" if breakfast else "Без питания",
            "cancel": "Бесплатная отмена за 48 часов до заезда · демо",
            "pay": "Предоплата",
            "price": round((price + 700 if breakfast else price * 0.95) / 100) * 100,
            "tag": "С завтраком · демо" if breakfast else "Предоплата · демо",
            "isDemo": True,
        },
    ]


def _rooms(
    osm_id: str, template: dict[str, Any], base: int, rng: Random, *, breakfast: bool
) -> list[dict[str, Any]]:
    categories = template["categories"][: rng.randint(2, len(template["categories"]))]
    rooms = []
    for i, category in enumerate(categories):
        room_id = f"{osm_id}:room:{i + 1}"
        capacity = rng.randint(*category["capacity"])
        price = round(base * (1 + 0.3 * i) / 100) * 100
        rooms.append(
            {
                "id": room_id,
                "name": category["name"],
                "area": rng.randint(*category["area_m2"]),
                "bed": "Двуспальная и диван-кровать"
                if capacity > 2
                else "Двуспальная или две односпальные",
                "capacity": capacity,
                "isDemo": True,
                "rates": rates(room_id, price, breakfast=breakfast),
            }
        )
    return rooms


def generate_cards(
    hotels: list[dict[str, str]], reference: dict[str, Any], *, seed: int = SEED
) -> dict[str, Any]:
    cards = {}
    for hotel in sorted(hotels, key=lambda row: row["osm_id"]):
        ref, district = hotel["osm_id"], hotel["district"]
        rng, kind = hotel_random(ref, seed), template_type(hotel)
        template = reference["types"][kind]
        amenity_flags = {
            key.removesuffix("_pct"): chance(rng, interval)
            for key, interval in template["amenities"].items()
        }
        if district == "krasnaya_polyana":
            amenity_flags["hotel_beach"] = False
        base = rng.randint(*reference["prices"][district][kind])
        rating = round(rng.uniform(7.4, 9.7), 1)
        cards[ref] = {
            "isDemo": True,
            "rating": rating,
            "ratingLabel": "Превосходно"
            if rating >= 9
            else "Отлично"
            if rating >= 8.5
            else "Очень хорошо",
            "tagline": TAGLINES[district],
            "amenities": [AMENITIES[key] for key, enabled in amenity_flags.items() if enabled],
            "rooms": _rooms(ref, template, base, rng, breakfast=amenity_flags["breakfast"]),
        }
    return {
        "isDemo": True,
        "seed": seed,
        "price_basis": "Ноябрь 2026, ₽ за номер за ночь; демо",
        "hotels": cards,
    }


def write_demo(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(value, allow_unicode=True, sort_keys=False), encoding="utf-8")
