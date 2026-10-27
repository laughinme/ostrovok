"""Build synthetic cards and hidden hotelier answers for the real OSM catalog."""

from typing import Any

import yaml

from pipeline.demo_cards import REFERENCE, generate_cards, write_demo
from pipeline.demo_history import generate_history
from pipeline.demo_truth import coastal_hotels, generate_truth
from pipeline.storage import DATA, read_csv


def run() -> None:
    hotels = read_csv("hotels.csv.gz")
    reference: dict[str, Any] = yaml.safe_load(REFERENCE.read_text(encoding="utf-8"))
    cards = generate_cards(hotels, reference)
    write_demo(DATA / "demo" / "room_types.yaml", cards)
    truth = generate_truth(hotels, cards, reference, coastal_hotels(hotels))
    write_demo(DATA / "demo" / "hidden_truth.yaml", truth)
    write_demo(DATA / "demo" / "history.yaml", generate_history(hotels, cards))
    print(f"Demo: {len(cards['hotels'])} hotel cards and hidden profiles", flush=True)
