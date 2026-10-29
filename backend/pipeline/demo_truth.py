import gzip
from random import Random
from typing import Any

import numpy as np
from shapely import Point, from_wkb, transform

from app.domain.catalog import building_facades, floors_of
from app.domain.geo.projection import LocalProjection
from app.domain.geo.types import LonLat
from pipeline.demo_cards import SEED, chance, hotel_random, template_type
from pipeline.storage import REGION


def _pets(rng: Random, template: dict[str, Any], *, luxury: bool) -> dict[str, Any]:
    allowed = chance(rng, template["pets_pct"])
    return {
        "allowed": allowed,
        "kinds": rng.choice([["dog"], ["dog", "cat"]]) if allowed else [],
        "max_kg": (30 if rng.random() < 0.1 else rng.choice([5, 10, 15])) if allowed else None,
        "fee_rub": rng.randint(10, 50) * 100
        if allowed and luxury
        else rng.randint(3, 15) * 100
        if allowed
        else 0,
        "fee_basis": "за сутки · демо",
    }


def _facade_rooms(hotel: dict[str, str], card: dict[str, Any], rng: Random) -> list[dict[str, Any]]:
    sides = [f.value for f in building_facades(from_wkb(hotel["footprint_wkb"]))]
    floors = floors_of(
        float(hotel["levels"]) if hotel["levels"] else None, float(hotel["height_m"])
    )
    mapping = []
    offset = rng.randrange(len(sides))
    for i, room in enumerate(card["rooms"]):
        count = min(len(sides), 2 if rng.random() < 0.4 else 1)
        for j in range(count):
            first = rng.randint(1, min(3, floors))
            mapping.append(
                {
                    "room_type_id": room["id"],
                    "facade": sides[(offset + i + j) % len(sides)],
                    "floor_from": first,
                    "floor_to": rng.randint(first, floors),
                }
            )
    return mapping


def _profile(
    hotel: dict[str, str],
    card: dict[str, Any],
    template: dict[str, Any],
    rng: Random,
    *,
    coastal: bool,
) -> dict[str, Any]:
    policies = template["policies"]
    floors = floors_of(
        float(hotel["levels"]) if hotel["levels"] else None, float(hotel["height_m"])
    )
    elevator = floors > 1 and chance(rng, policies["elevator_pct"])
    return {
        "isDemo": True,
        "pets_policy": _pets(rng, template, luxury=hotel["stars"] == "5"),
        "soundproofing": chance(rng, policies["soundproof_windows_pct"]),
        "blackout": chance(rng, policies["blackout_curtains_pct"]),
        "ac": "Кондиционер" in card["amenities"],
        "elevator": elevator,
        "step_free": (elevator or floors == 1) and chance(rng, policies["step_free_entrance_pct"]),
        "facade_rooms": _facade_rooms(hotel, card, rng),
        "claims": {"sea_view_all_rooms": True} if coastal and rng.random() < 0.25 else {},
        "persona": rng.choice(["краткий", "многословный", "расплывчатый"]),
    }


def generate_truth(
    hotels: list[dict[str, str]],
    cards: dict[str, Any],
    reference: dict[str, Any],
    coastal_ids: set[str],
    *,
    seed: int = SEED,
) -> dict[str, Any]:
    truth = {
        hotel["osm_id"]: _profile(
            hotel,
            cards["hotels"][hotel["osm_id"]],
            reference["types"][template_type(hotel)],
            hotel_random(hotel["osm_id"], seed, stream="truth"),
            coastal=hotel["osm_id"] in coastal_ids,
        )
        for hotel in sorted(hotels, key=lambda row: row["osm_id"])
    }
    return {
        "isDemo": True,
        "seed": seed,
        "description": "Скрытая правда симулятора - демо, не подтверждённые свойства отелей",
        "hotels": truth,
    }


def coastal_hotels(hotels: list[dict[str, str]]) -> set[str]:
    with gzip.open(REGION / "sea.wkb.gz", "rt", encoding="ascii") as stream:
        sea = from_wkb(stream.read().strip())
    projection = LocalProjection(LonLat(39.9, 43.6))
    shore = transform(sea.boundary, projection.forward)
    return {
        hotel["osm_id"]
        for hotel in hotels
        if hotel["district"] != "krasnaya_polyana"
        and shore.distance(
            Point(projection.forward(np.array([float(hotel["lon"]), float(hotel["lat"])])))
        )
        <= 800
    }
