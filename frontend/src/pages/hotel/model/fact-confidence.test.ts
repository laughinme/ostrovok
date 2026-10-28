import { describe, expect, it } from "vitest";
import { factConfidence, factConfidenceStars } from "./fact-confidence";

describe("fact confidence", () => {
  it("prioritizes conflicting and outdated evidence over a high score", () => {
    expect(factConfidence({ confidence: 1, status: "conflict" }).label).toBe("Противоречие");
    expect(factConfidence({ confidence: 1, status: "stale" }).label).toBe("Нужно обновить");
  });

  it("distinguishes zero confidence from a missing assessment", () => {
    expect(factConfidence({ confidence: 0 }).label).toBe("Низкая");
    expect(factConfidence({ confidence: Number.NaN }).label).toBe("Нет оценки");
  });
});

describe("three confidence stars", () => {
  it("uses the previous confidence thresholds and distinguishes zero from an unknown value", () => {
    expect(
      [0, 0.1, 0.69, 0.7, 0.89, 0.9, 1].map(
        (confidence) => factConfidenceStars({ confidence }).count,
      ),
    ).toEqual([0, 1, 1, 2, 2, 3, 3]);
    expect(factConfidenceStars({ confidence: 0 })).toMatchObject({
      count: 0,
      percentage: 0,
      tooltip: "Уверенность в факте: 0%",
    });
    expect(factConfidenceStars({ confidence: Number.NaN })).toMatchObject({
      count: 0,
      percentage: null,
      tooltip: "Уверенность не указана",
    });
  });
  it("preserves freshness and contradiction warnings alongside numerical confidence", () => {
    expect(factConfidenceStars({ confidence: 1, status: "stale" })).toMatchObject({
      count: 3,
      status: "Нужно обновить",
    });
    expect(factConfidenceStars({ confidence: 0.9, status: "conflict" })).toMatchObject({
      count: 3,
      status: "Противоречие",
    });
  });
});
