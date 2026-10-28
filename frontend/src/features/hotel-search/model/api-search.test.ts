import { describe, expect, it } from "vitest";
import type { ApiIntent } from "@/entities/hotel";
import { criteriaFromIntent, intentForCriteria } from "./api-search";
import { parseQuery } from "./matching";

const intent: ApiIntent = {
  planner: "rules",
  trip: {},
  chips: [
    {
      id: "sea",
      characteristic: "sea_view",
      label: "Море из окна",
      params: { minFloor: 5 },
      importance: "nice",
      checkable: "compute",
      fromProfile: false,
    },
    {
      importance: "important",
      checkable: "compute",
      fromProfile: false,
      id: "walk",
      characteristic: "beach_walk",
      label: "Пляж пешком",
      params: { maxWalkMinutes: 5 },
    },
  ],
};

describe("server intent canvas", () => {
  it("does not invent criteria for an unknown query", () => {
    expect(criteriaFromIntent({ ...intent, chips: [] })).toEqual([]);
    expect(criteriaFromIntent()).toEqual([]);
  });
  it("keeps the beach separate from sea view and preserves parameters", () => {
    expect(criteriaFromIntent(intent)).toEqual(["sea"]);
    expect(intentForCriteria(intent, criteriaFromIntent(intent))).toEqual(
      expect.arrayContaining(intent.chips),
    );
    expect(criteriaFromIntent({ ...intent, chips: [intent.chips[1]!] })).toEqual([]);
  });
  it("allows removing the last filter without removing other wishes", () => {
    expect(intentForCriteria(intent, [])).toEqual([intent.chips[1]]);
  });
});

const editingIntent: ApiIntent = {
  planner: "rules",
  trip: {},
  chips: [
    {
      id: "beach",
      characteristic: "stroller_to_sea",
      label: "Без ступеней",
      importance: "must",
      checkable: "compute",
      fromProfile: false,
      params: { noClimb: true },
    },
    {
      id: "noise",
      characteristic: "night_noise",
      label: "Тихо ночью",
      importance: "nice",
      checkable: "compute",
      fromProfile: false,
    },
    {
      id: "wish",
      characteristic: null,
      label: "Йога на крыше",
      importance: "important",
      checkable: "cannot",
      fromProfile: false,
    },
  ],
};

describe("server editingIntent editing", () => {
  it("keeps uncommon wishes, importance and parameters when a quick criterion changes", () => {
    const chips = intentForCriteria(editingIntent, ["quiet", "sea"]);
    expect(chips).toEqual(expect.arrayContaining(editingIntent.chips));
    expect(chips.find((chip) => chip.characteristic === "sea_view")).toMatchObject({
      importance: "important",
    });
  });
  it("allows removal of the last mapped criterion without removing other wishes", () => {
    expect(intentForCriteria(editingIntent, []).map((chip) => chip.id)).toEqual(["beach", "wish"]);
  });
  it("does not invent preferences for an unrelated request", () => {
    expect(parseQuery("Хочу небольшой отель с йогой на крыше")).toEqual([]);
  });
});
