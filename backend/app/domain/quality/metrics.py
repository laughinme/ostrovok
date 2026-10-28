from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from math import isfinite, log2


def ratio(numerator: int | float, denominator: int | float) -> float | None:
    return numerator / denominator if denominator else None


@dataclass(frozen=True, slots=True)
class KeyCounts:
    tp: int = 0
    fp: int = 0
    fn: int = 0

    def scores(self) -> dict[str, int | float | None]:
        return {
            "tp": self.tp,
            "fp": self.fp,
            "fn": self.fn,
            "precision": ratio(self.tp, self.tp + self.fp),
            "recall": ratio(self.tp, self.tp + self.fn),
            "f1": ratio(2 * self.tp, 2 * self.tp + self.fp + self.fn),
        }


def key_counts(expected: set[str], predicted: set[str]) -> KeyCounts:
    return KeyCounts(
        len(expected & predicted), len(predicted - expected), len(expected - predicted)
    )


def ndcg_at_k(ranked: Sequence[str], relevance: Mapping[str, int], k: int = 10) -> float | None:
    """Graded gain 2**grade-1. Unjudged results gain zero; no positive labels means no score."""
    if k < 1 or len(set(ranked)) != len(ranked):
        raise ValueError("k must be positive and ranked ids must be unique")
    if any(grade < 0 for grade in relevance.values()):
        raise ValueError("relevance must be nonnegative")

    def dcg(grades: Sequence[int]) -> float:
        return sum((2.0**grade - 1) / log2(i + 2) for i, grade in enumerate(grades[:k]))

    ideal = dcg(sorted(relevance.values(), reverse=True))
    return dcg([relevance.get(key, 0) for key in ranked[:k]]) / ideal if ideal else None


def calibration(samples: Sequence[tuple[float, bool]], bins: int = 10) -> dict[str, object]:
    """Probability of a positive label versus observed positive frequency, in equal-width bins."""
    if bins < 1 or any(not isfinite(p) or not 0 <= p <= 1 for p, _ in samples):
        raise ValueError("bins must be positive and probabilities finite within [0,1]")
    groups: list[list[tuple[float, bool]]] = [[] for _ in range(bins)]
    for probability, label in samples:
        groups[min(int(probability * bins), bins - 1)].append((probability, label))
    reliability = []
    error = 0.0
    for i, group in enumerate(groups):
        mean = ratio(sum(p for p, _ in group), len(group))
        frequency = ratio(sum(y for _, y in group), len(group))
        if mean is not None and frequency is not None:
            error += len(group) * abs(mean - frequency)
        reliability.append(
            {
                "from": i / bins,
                "to": (i + 1) / bins,
                "n": len(group),
                "meanProbability": mean,
                "positiveRate": frequency,
            }
        )
    return {
        "n": len(samples),
        "accuracy": ratio(sum((p >= 0.5) == y for p, y in samples), len(samples)),
        "ece": ratio(error, len(samples)),
        "reliability": reliability,
    }
