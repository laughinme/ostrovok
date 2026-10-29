import { describe, expect, it } from "vitest";
import type { ApiRun } from "@/entities/agent-run";
import type { RegistryEntry, Schema } from "../api/console";
import {
  computedCharacteristics,
  confidenceRange,
  onboardingQuestions,
  runSeconds,
} from "./onboarding";

const entry = (key: string, method = "view", status = "published") =>
  ({ key, method, status }) as RegistryEntry;
const fact = (characteristic: string, confidence = 0.9, extras = {}) =>
  ({
    characteristic,
    confidence,
    source: "computed",
    isDemo: false,
    ...extras,
  }) as Schema["FactOut"];
const run = (extras = {}) =>
  ({ createdAt: "2026-10-29T00:00:00Z", steps: [], ...extras }) as unknown as ApiRun;

describe("live hotel onboarding", () => {
  it("counts characteristics once across facades and leaves missing computations visible", () => {
    const rows = computedCharacteristics(
      [
        entry("sea"),
        entry("noise"),
        entry("pets", "ask_hotelier"),
        entry("draft", "view", "draft"),
      ],
      [fact("sea"), fact("sea", 0.7), fact("pets")],
    );
    expect(rows.map((row) => [row.key, row.facts.length])).toEqual([
      ["sea", 2],
      ["noise", 0],
    ]);
    expect(confidenceRange(rows[0]!.facts)).toBe("70–90%");
    expect(confidenceRange(rows[1]!.facts)).toBe("-");
  });

  it("does not present hotelier answers or demo facts as agent computations", () => {
    const rows = computedCharacteristics(
      [entry("sea"), entry("climate")],
      [
        fact("sea", 0.95, { isDemo: true }),
        fact("sea", 0.8, { source: "hotelier" }),
        fact("climate", 0.85, { source: "open_data" }),
      ],
    );
    expect(rows[0]!.facts).toEqual([]);
    expect(confidenceRange(rows[1]!.facts)).toBe("85%");
    expect(confidenceRange([fact("invalid", NaN)])).toBe("-");
  });

  it("shows the actual final questions, preserving their text and reason", () => {
    const steps = [
      { tool: "hotelier.ask", output: [{ id: "old", text: "Прежний вопрос" }] },
      {
        tool: "hotelier.ask",
        output: [
          null,
          { id: "no-text" },
          { id: "q1", text: "Есть ли лифт?", why: "Доступность номера" },
        ],
      },
    ];
    expect(onboardingQuestions(run({ steps }))).toEqual([
      { id: "q1", text: "Есть ли лифт?", why: "Доступность номера" },
    ]);
    expect(onboardingQuestions(undefined)).toEqual([]);
    expect(onboardingQuestions(run({ steps: [{ tool: "hotelier.ask", output: {} }] }))).toEqual([]);
  });

  it("includes queue time and freezes elapsed time on completion", () => {
    const now = Date.parse("2026-10-29T00:02:01Z");
    expect(runSeconds(run(), now)).toBe(121);
    expect(runSeconds(run({ finishedAt: "2026-10-29T00:00:18Z" }), now)).toBe(18);
    expect(runSeconds(run({ createdAt: "bad" }), now)).toBe(0);
    expect(runSeconds(undefined, now)).toBe(0);
  });
});
