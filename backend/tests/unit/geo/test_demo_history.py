"""All history references resolve and the actions support the intended taste profile."""

from datetime import date, datetime
from pathlib import Path

import yaml

from pipeline.demo_history import generate_history
from pipeline.storage import read_csv


def test_guest_history_references_and_taste_evidence() -> None:
    demo = Path(__file__).resolve().parents[3] / "data/demo"
    cards = yaml.safe_load((demo / "room_types.yaml").read_text())
    history = yaml.safe_load((demo / "history.yaml").read_text())
    hotels = read_csv("hotels.csv.gz")
    assert history == generate_history(hotels, cards)
    assert history == generate_history(hotels[::-1], cards)
    assert history["isDemo"]
    personas = yaml.safe_load((demo / "users.yaml").read_text())["personas"]
    assert "guest_anna" in {p["key"] for p in personas}
    guest = history["guests"]["guest_anna"]
    for booking in guest["bookings"]:
        assert booking["isDemo"]
        room = next(
            r
            for r in cards["hotels"][booking["osm_id"]]["rooms"]
            if r["id"] == booking["room_type_id"]
        )
        assert booking["rate_plan_id"] in {r["id"] for r in room["rates"]}
        assert date.fromisoformat(booking["check_in"]) < date.fromisoformat(booking["check_out"])
        assert booking["status"] == "completed"
    known = set(cards["hotels"])
    assert set(guest["saved_hotels"]) <= known
    assert {r["osm_id"] for r in guest["rejected_hotels"]} <= known
    edits = {e["characteristic"]: e for e in guest["chip_edits"]}
    assert edits["night_noise"]["to"] == "must"
    assert edits["sea_view"]["to"] == "nice"
    assert edits["steep_streets"]["to"] == "must"
    assert edits["steep_streets"]["operator"] == "eq"
    assert edits["steep_streets"]["value"] is False
    assert all(datetime.fromisoformat(e["at"]).tzinfo is not None for e in edits.values())
    assert {r["characteristic"] for r in guest["rejected_hotels"]} == {
        "night_noise",
        "steep_streets",
    }
