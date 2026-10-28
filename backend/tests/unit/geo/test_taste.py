from app.domain.knowledge.characteristic import Checkable
from app.domain.search.intent import Chip, Importance, Intent
from app.domain.search.score import chip_weight
from app.domain.search.taste import (
    TasteEvent,
    TasteProfile,
    TasteWeight,
    apply_taste,
    infer_taste,
    taste_summary,
)
from app.domain.search.trip import TripDraft


def test_history_explanations_use_actual_counts_and_explicit_edits() -> None:
    weights = infer_taste(
        [
            TasteEvent("booking", {"request": "Тихий номер"}),
            TasteEvent("booking", {"request": "Тихая сторона"}),
            TasteEvent(
                "chip_edit",
                {
                    "characteristic": "night_noise",
                    "to": "must",
                    "value": True,
                    "reason": "Сон важнее",
                },
            ),
            TasteEvent("chip_edit", {"characteristic": "sea_view", "to": "nice", "value": True}),
            TasteEvent(
                "chip_edit", {"characteristic": "steep_streets", "to": "must", "value": False}
            ),
        ]
    )
    assert weights["night_noise"].weight == 3
    assert "2 из 2" in weights["night_noise"].because
    assert taste_summary(tuple(weights.values())) == ("Тишина важнее вида", "Не любит подъёмы")
    assert weights["steep_streets"].value is False


def test_profile_never_overrides_explicit_intent_and_keeps_fractional_weights() -> None:
    explicit = Chip("c1", "Море", Importance.MUST, Checkable.COMPUTE, "sea_view")
    intent = Intent(None, (explicit,), TripDraft(), ())
    profile = TasteProfile(
        True, (), (TasteWeight("sea_view", 1, "история"), TasteWeight("night_noise", 2.7, "правка"))
    )
    titles = {"sea_view": ("Море", Checkable.COMPUTE), "night_noise": ("Тишина", Checkable.COMPUTE)}
    merged = apply_taste(intent, profile, titles)
    assert merged.chips[0] is explicit
    assert len(merged.chips) == 2
    assert merged.chips[1].from_profile
    assert chip_weight(merged.chips[1]) == 2.7
    assert apply_taste(merged, TasteProfile(False, (), ()), titles).chips == (explicit,)
