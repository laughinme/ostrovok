import { describe, expect, it } from "vitest";
import { factConfidence } from "./fact-confidence";

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
