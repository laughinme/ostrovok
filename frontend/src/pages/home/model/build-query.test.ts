import { describe, expect, it } from "vitest";
import { parseQuery } from "@/features/hotel-search";
import { buildLandingQuery } from "./build-query";
import { MOODS } from "./catalog";

describe("landing search integration", () => {
  it("keeps typed text and includes selected quick preferences", () => {
    const query = buildLandingQuery("Отель у моря", "Запасной запрос", [
      { key: "dog", importance: "must" },
      { key: "work", importance: "important" },
    ]);
    expect(query).toBe("Отель у моря, с собакой, буду работать");
    expect(parseQuery(query)).toEqual(["sea", "work", "pets"]);
  });
  it("uses the complete example for an empty input", () => {
    expect(buildLandingQuery("  ", "Тихий номер с закатом над морем", [])).toBe(
      "Тихий номер с закатом над морем",
    );
  });
  it.each([
    ["sea", ["sea"]],
    ["calm", ["quiet", "mountains"]],
    ["kids", ["quiet", "sea", "kids"]],
    ["sunset", ["quiet", "sunset"]],
  ] as const)("preserves the %s collection criteria in the old search", (id, expected) => {
    const mood = MOODS.find((item) => item.id === id)!;
    const criteria = parseQuery(buildLandingQuery(mood.title, "", mood.chips));
    expect(criteria).toEqual(expect.arrayContaining([...expected]));
  });
});
