import math
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

_EPS = 1e-4
PRIOR = 0.5
SURE_FROM = 0.85
LIKELY_FROM = 0.65
UNSURE_FROM = 0.35
DECAY_STARTS_AT = 0.8


class ConfidenceLabel(StrEnum):
    """Wording from 08 §7; thresholds are part of the contract with the UI."""

    SURE = "точно"
    LIKELY = "скорее да"
    UNSURE = "не уверены"
    UNLIKELY = "скорее нет"


def label(probability: float) -> ConfidenceLabel:
    if probability >= SURE_FROM:
        return ConfidenceLabel.SURE
    if probability >= LIKELY_FROM:
        return ConfidenceLabel.LIKELY
    if probability >= UNSURE_FROM:
        return ConfidenceLabel.UNSURE
    return ConfidenceLabel.UNLIKELY


def logit(p: float) -> float:
    p = min(max(p, _EPS), 1 - _EPS)
    return math.log(p / (1 - p))


def sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


@dataclass(frozen=True, slots=True)
class Vote:
    """One source's probability that a statement is true, weighted by how much we trust it."""

    probability: float
    reliability: float


def pool(votes: Iterable[Vote], prior: float = PRIOR) -> float:
    """
    Log-odds pooling (09 §5.4): logit(p) = logit(p0) + Σ r·(logit(pₛ) − logit(p0)).
    Reliability below one keeps two dependent sources from inflating each other.
    """
    base = logit(prior)
    return sigmoid(base + sum(v.reliability * (logit(v.probability) - base) for v in votes))


def decay(
    probability: float, *, observed_at: datetime, valid_until: datetime, now: datetime
) -> float:
    """After 80 % of the shelf life the probability slides linearly to 0.5, reached at expiry."""
    total = (valid_until - observed_at).total_seconds()
    if total <= 0:
        return PRIOR
    age = (now - observed_at).total_seconds() / total
    if age <= DECAY_STARTS_AT:
        return probability
    weight = max(0.0, 1 - (age - DECAY_STARTS_AT) / (1 - DECAY_STARTS_AT))
    return PRIOR + (probability - PRIOR) * weight


def beta_update(probability: float, *, yes: int, no: int, prior_weight: float = 10.0) -> float:
    """Guest feedback (09 §5.4): Beta prior from the current probability, weighing 10 trips."""
    alpha = probability * prior_weight + yes
    beta = (1 - probability) * prior_weight + no
    return alpha / (alpha + beta)
