from pathlib import Path

from app.domain.partner.simulator import demo_delay, simulate_answer
from app.infra.partner_truth import YamlHiddenTruth

DATA = Path(__file__).resolve().parents[3] / "data"


def test_delay_is_repeatable_and_in_configured_range() -> None:
    assert demo_delay("question", (5, 30)) == demo_delay("question", (5, 30))
    assert 5 <= demo_delay("question", (5, 30)) <= 30
    assert demo_delay("question", (0, 0)) == 0


def test_real_hidden_truth_uses_actual_room_mappings() -> None:
    truth = YamlHiddenTruth(DATA / "demo/hidden_truth.yaml")
    assert len(truth.claimed_hotels()) == 39
    for osm_id in truth.claimed_hotels():
        profile = truth.profile(osm_id)
        assert profile
        answer = simulate_answer(profile, "facade_rooms", question_id="q", clarification=True)
        assert answer
        assert len(answer.payload["mappings"]) == len(profile["facade_rooms"])
        claim = simulate_answer(profile, "sea_view", question_id="q", clarification=True)
        assert claim
        assert "все номера" in claim.text


def test_vague_persona_becomes_precise_after_clarification() -> None:
    profile = {"persona": "расплывчатый", "blackout": False}
    vague_id = next(
        str(i)
        for i in range(100)
        if "Кажется" in simulate_answer(profile, "blackout", question_id=str(i)).text
    )  # type: ignore[union-attr]
    answer = simulate_answer(profile, "blackout", question_id=vague_id, clarification=True)
    assert answer
    assert answer.text == "Нет"
