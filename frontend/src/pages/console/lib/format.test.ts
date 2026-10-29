import { describe, expect, it } from "vitest";
import type { ApiRun } from "@/entities/agent-run";
import { characteristicKey, dateTime, money, nearbyBuilding, percent, record } from "./format";

const run: ApiRun = {
  id: "r1",
  agent: "curator",
  goal: "Аптека",
  planner: "rules",
  status: "done",
  createdAt: "2026-10-29T10:00:00Z",
  steps: [],
};

describe("console formatting", () => {
  it("preserves small costs and missing measurements", () => {
    expect(money(0.0012)).toBe("$0.0012");
    expect(money(2)).toBe("$2.00");
    expect(money(null)).toBe("-");
    expect(percent(0.827)).toBe("83%");
    expect(percent(null)).toBe("-");
    expect(percent(NaN)).toBe("-");
    expect(dateTime("invalid")).toBe("-");
    expect(dateTime(run.createdAt)).toContain("29");
    expect(record(null)).toEqual({});
    expect(record([])).toEqual({});
    expect(record({ key: "x" })).toEqual({ key: "x" });
  });
  it("only publishes completed runs and prefers the last keyed decision", () => {
    const steps: ApiRun["steps"] = ["old", "new"].map((key, seq) => ({
      seq,
      at: run.createdAt,
      kind: "decision",
      summary: key,
      output: { key },
    }));
    expect(characteristicKey({ ...run, steps })).toBe("new");
    expect(characteristicKey({ ...run, steps, status: "running" })).toBeNull();
    expect(characteristicKey({ ...run, steps, status: "failed" })).toBeNull();
    expect(characteristicKey({ ...run, subject: { key: "subject" } })).toBe("subject");
    expect(characteristicKey(undefined)).toBeNull();
  });
  it("does not invent a key when the Curator cannot create a characteristic", () => {
    expect(characteristicKey(run)).toBeNull();
    expect(characteristicKey({ ...run, subject: { key: "" } })).toBeNull();
    expect(characteristicKey({ ...run, subject: { characteristic: "pharmacy" } })).toBe("pharmacy");
  });
  it("places a ten-floor building sixty metres south of the selected hotel", () => {
    const building = nearbyBuilding([39.72, 43.6], "Маяк");
    expect(building.lon).toBe(39.72);
    expect((43.6 - building.lat) * 111320).toBeCloseTo(60);
    expect(building.floors).toBe(10);
    expect(building.title).toContain("Маяк");
  });
});
