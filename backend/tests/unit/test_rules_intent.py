from datetime import date
from pathlib import Path

import pytest
import yaml

from app.domain.knowledge.characteristic import Checkable
from app.domain.search.intent import Vocabulary, parse_intent

REGISTRY = Path(__file__).resolve().parents[2] / "data" / "registry"
TODAY = date(2026, 10, 28)


@pytest.fixture(scope="module")
def vocabulary() -> Vocabulary:
    entries = yaml.safe_load((REGISTRY / "characteristics.yaml").read_text())["characteristics"]
    guest = yaml.safe_load((REGISTRY / "synonyms.yaml").read_text())["synonyms"]
    return Vocabulary.build(
        ((e["key"], e["title"], Checkable.COMPUTE, e.get("synonyms", ())) for e in entries),
        {key: entry.get("positive", ()) for key, entry in guest.items()},
    )


def _keys(text: str, vocabulary: Vocabulary) -> set[str]:
    return {
        c.characteristic
        for c in parse_intent(text, vocabulary, today=TODAY).chips
        if c.characteristic
    }


@pytest.mark.parametrize(
    ("text", "keys"),
    [
        ("Тихий отель у моря", {"night_noise", "beach_walk"}),
        ("Тихий номер с закатом над морем", {"night_noise", "sunset_over_sea"}),
        ("отель с видом на горы и парковкой", {"mountain_view", "parking"}),
        (
            "Неделю поработать у моря, чтобы днём было тихо",
            {"remote_work", "beach_walk", "day_noise"},
        ),
    ],
)
def test_landing_phrases(text: str, keys: set[str], vocabulary: Vocabulary) -> None:
    assert _keys(text, vocabulary) == keys


def test_mentioning_the_sea_is_not_living_by_it(vocabulary: Vocabulary) -> None:
    assert "beach_walk" not in _keys("номер с видом на море на высоком этаже", vocabulary)


def test_declined_wishes_are_dropped(vocabulary: Vocabulary) -> None:
    keys = _keys(
        "Центр Сочи, обязательно лифт, парковка не нужна, вид на море не важен", vocabulary
    )

    assert keys == {"elevator"}


def test_refusal_far_from_a_wish_keeps_it(vocabulary: Vocabulary) -> None:
    text = "нужна парковка обязательно машина своя а вот завтрак нам не нужен совсем"

    assert "parking" in _keys(text, vocabulary)


@pytest.mark.parametrize("text", ["Сочи", "море", "бассейн", "2026-11-12 — 2026-11-15"])
def test_short_input_has_no_fuzzy_inventions(text: str, vocabulary: Vocabulary) -> None:
    assert not _keys(text, vocabulary)


@pytest.mark.parametrize(
    ("text", "keys"),
    [
        ("quiet hotel with sea view for two adults", {"night_noise", "sea_view"}),
        ("pet friendly hotel near the beach", {"pets_policy", "beach_walk"}),
        ("без собаки, нужен вид на море", {"sea_view"}),
        ("на выходных без машины", set()),
        ("тишина", {"night_noise"}),
        ("пёс 8 кг, лифт", {"pets_policy", "elevator"}),
        ("парковка и хороший интернет", {"parking", "remote_work"}),
    ],
)
def test_jury_phrases(text: str, keys: set[str], vocabulary: Vocabulary) -> None:
    assert _keys(text, vocabulary) == keys


def test_ambiguous_and_unsupported_wishes_get_specific_hints(vocabulary: Vocabulary) -> None:
    sea = parse_intent("море", vocabulary, today=TODAY)
    assert any("Море из окна или пляж" in h for h in sea.hints)
    pool = parse_intent("бассейн", vocabulary, today=TODAY)
    assert any("Данных о бассейнах пока нет" in h for h in pool.hints)
