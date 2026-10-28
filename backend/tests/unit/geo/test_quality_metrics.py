import math

import pytest

from app.domain.quality.metrics import calibration, key_counts, ndcg_at_k


def test_key_metrics_count_false_positives_and_missing_keys() -> None:
    scores = key_counts({"sea", "noise"}, {"sea", "pets"}).scores()
    assert scores == {"tp": 1, "fp": 1, "fn": 1, "precision": 0.5, "recall": 0.5, "f1": 0.5}
    assert key_counts(set(), set()).scores()["f1"] is None


def test_ndcg_penalizes_order_and_missing_relevant_hotels() -> None:
    labels = {"a": 3, "b": 1, "c": 0}
    assert ndcg_at_k(["a", "b", "c"], labels) == 1
    assert ndcg_at_k(["b", "a", "c"], labels) == pytest.approx(
        (1 + 7 / math.log2(3)) / (7 + 1 / math.log2(3))
    )
    assert ndcg_at_k(["unjudged", "c"], labels) == 0
    assert ndcg_at_k([], {"a": 0}) is None
    with pytest.raises(ValueError, match="unique"):
        ndcg_at_k(["a", "a"], labels)


def test_calibration_uses_positive_frequency_and_includes_probability_one() -> None:
    report = calibration([(0.2, False), (0.2, True), (1.0, True)])
    assert report["n"] == 3
    assert report["accuracy"] == pytest.approx(2 / 3)
    assert report["ece"] == pytest.approx(0.2)
    assert calibration([])["ece"] is None
    with pytest.raises(ValueError, match="finite"):
        calibration([(float("nan"), True)])
