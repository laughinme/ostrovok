from pathlib import Path

import yaml

from pipeline.demo_cards import REFERENCE, generate_cards, template_type
from pipeline.storage import read_csv


def test_cards_are_stable_per_hotel_and_seed() -> None:
    hotels = read_csv("hotels.csv.gz")
    reference = yaml.safe_load(REFERENCE.read_text())
    first = generate_cards(hotels, reference)
    assert first == generate_cards(list(reversed(hotels)), reference)
    only = generate_cards(hotels[:1], reference)
    assert first["hotels"][hotels[0]["osm_id"]] == only["hotels"][hotels[0]["osm_id"]]
    assert first != generate_cards(hotels, reference, seed=42)


def test_published_cards_fit_reference_and_database_columns() -> None:
    path = Path(__file__).resolve().parents[3] / "data/demo/room_types.yaml"
    published = yaml.safe_load(path.read_text())
    reference = yaml.safe_load(REFERENCE.read_text())
    hotels = read_csv("hotels.csv.gz")
    assert published == generate_cards(hotels, reference)
    assert len(published["hotels"]) == 200
    ids = []
    for hotel in hotels:
        card = published["hotels"][hotel["osm_id"]]
        categories = reference["types"][template_type(hotel)]["categories"]
        assert card["isDemo"]
        assert 7 <= card["rating"] <= 10
        assert 2 <= len(card["rooms"]) <= 5
        if hotel["district"] == "krasnaya_polyana":
            assert "Пляжная зона отеля" not in card["amenities"]
        for room, category in zip(card["rooms"], categories, strict=False):
            ids.append(room["id"])
            assert len(room["id"]) <= 64
            assert len(room["bed"]) <= 64
            assert category["area_m2"][0] <= room["area"] <= category["area_m2"][1]
            assert category["capacity"][0] <= room["capacity"] <= category["capacity"][1]
            for rate in room["rates"]:
                ids.append(rate["id"])
                assert rate["isDemo"]
                assert rate["price"] >= 500
                assert rate["price"] % 100 == 0
                assert {"id", "meal", "cancel", "pay", "price"} <= set(rate)
    assert len(ids) == len(set(ids))
