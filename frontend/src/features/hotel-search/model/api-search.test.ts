import { describe, expect, it } from "vitest";
import { intentForCriteria } from "./api-search";
import { parseQuery } from "./matching";
import type { ApiIntent } from "@/entities/hotel";

const intent: ApiIntent = {
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

describe("server intent editing", () => {
  it("keeps uncommon wishes, importance and parameters when a quick criterion changes", () => {
    const chips = intentForCriteria(intent, ["quiet", "sea"]);
    expect(chips).toEqual(expect.arrayContaining(intent.chips));
    expect(chips.find((chip) => chip.characteristic === "sea_view")).toMatchObject({
      importance: "important",
    });
  });
  it("allows removal of the last mapped criterion without removing other wishes", () => {
    expect(intentForCriteria(intent, []).map((chip) => chip.id)).toEqual(["beach", "wish"]);
  });
  it("does not invent preferences for an unrelated request", () => {
    expect(parseQuery("Хочу небольшой отель с йогой на крыше")).toEqual([]);
  });
});
