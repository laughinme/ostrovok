from pathlib import Path

import yaml
from shapely import from_wkb

from app.domain.catalog import building_facades, floors_of
from pipeline.demo_cards import REFERENCE, generate_cards
from pipeline.demo_truth import coastal_hotels, generate_truth
from pipeline.storage import read_csv


def test_synthetic_truth_is_deterministic_and_scopes_claims() -> None:
    hotels = read_csv("hotels.csv.gz")[:5]
    reference = yaml.safe_load(REFERENCE.read_text())
    cards = generate_cards(hotels, reference)
    coastal = {hotels[0]["osm_id"]}
    first = generate_truth(hotels, cards, reference, coastal)
    assert first == generate_truth(hotels[::-1], cards, reference, coastal)
    assert first != generate_truth(hotels, cards, reference, coastal, seed=42)
    for ref, truth in first["hotels"].items():
        if ref not in coastal:
            assert truth["claims"] == {}


def test_published_truth_matches_real_buildings_and_rooms() -> None:
    demo = Path(__file__).resolve().parents[3] / "data/demo"
    cards = yaml.safe_load((demo / "room_types.yaml").read_text())["hotels"]
    truth = yaml.safe_load((demo / "hidden_truth.yaml").read_text())
    assert truth["isDemo"]
    assert set(truth["hotels"]) == set(cards)
    claims = []
    for hotel in read_csv("hotels.csv.gz"):
        ref = hotel["osm_id"]
        profile = truth["hotels"][ref]
        assert profile["isDemo"]
        sides = {f.value for f in building_facades(from_wkb(hotel["footprint_wkb"]))}
        floors = floors_of(
            float(hotel["levels"]) if hotel["levels"] else None, float(hotel["height_m"])
        )
        rooms = {room["id"] for room in cards[ref]["rooms"]}
        assert {r["room_type_id"] for r in profile["facade_rooms"]} == rooms
        for mapping in profile["facade_rooms"]:
            assert mapping["facade"] in sides
            assert 1 <= mapping["floor_from"] <= mapping["floor_to"] <= floors
        for key in ("soundproofing", "blackout", "ac", "elevator", "step_free"):
            assert isinstance(profile[key], bool)
        assert profile["ac"] == ("Кондиционер" in cards[ref]["amenities"])
        if profile["step_free"] and floors > 1:
            assert profile["elevator"]
        pets = profile["pets_policy"]
        assert bool(pets["kinds"]) == pets["allowed"]
        if pets["allowed"]:
            assert 0 < pets["max_kg"] <= 35
            assert pets["fee_rub"] > 0
        else:
            assert pets["max_kg"] is None
            assert pets["fee_rub"] == 0
        assert profile["persona"] in {"краткий", "многословный", "расплывчатый"}
        if profile["claims"]:
            assert hotel["district"] != "krasnaya_polyana"
            claims.append(ref)
    assert 5 <= len(claims) <= 60

    assert set(claims) <= coastal_hotels(read_csv("hotels.csv.gz"))
