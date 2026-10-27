from datetime import UTC, datetime, timedelta

import pytest

from app.domain.knowledge.confidence import (
    ConfidenceLabel,
    Vote,
    beta_update,
    decay,
    label,
    pool,
)


@pytest.mark.parametrize(
    ("p", "expected"),
    [
        (0.9, ConfidenceLabel.SURE),
        (0.85, ConfidenceLabel.SURE),
        (0.7, ConfidenceLabel.LIKELY),
        (0.5, ConfidenceLabel.UNSURE),
        (0.1, ConfidenceLabel.UNLIKELY),
    ],
)
def test_labels_follow_the_contract(p: float, expected: ConfidenceLabel) -> None:
    assert label(p) is expected


def test_single_trusted_vote_is_kept() -> None:
    assert pool([Vote(0.82, 1.0)]) == pytest.approx(0.82, abs=1e-3)


def test_agreeing_sources_strengthen_but_unreliable_one_barely_moves() -> None:
    computed = Vote(0.8, 1.0)

    assert pool([computed, Vote(0.8, 1.0)]) > 0.9
    assert 0.8 < pool([computed, Vote(0.95, 0.1)]) < 0.86


def test_disagreement_lands_between() -> None:
    p = pool([Vote(0.9, 1.0), Vote(0.1, 0.35)])

    assert 0.5 < p < 0.9


def test_decay_starts_after_eighty_percent() -> None:
    start = datetime(2026, 1, 1, tzinfo=UTC)
    end = start + timedelta(days=100)

    assert decay(0.9, observed_at=start, valid_until=end, now=start + timedelta(days=50)) == 0.9
    assert decay(0.9, observed_at=start, valid_until=end, now=start + timedelta(days=90)) == (
        pytest.approx(0.7)
    )
    assert decay(0.9, observed_at=start, valid_until=end, now=end) == pytest.approx(0.5)


def test_guest_feedback_moves_the_estimate() -> None:
    assert beta_update(0.5, yes=10, no=0) == pytest.approx(0.75)
    assert beta_update(0.8, yes=0, no=0) == pytest.approx(0.8)
