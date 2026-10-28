import { describe, expect, it } from "vitest";
import { selectHotelHighlights } from "./hotel-highlights";
import type { Fact } from "./types";
const fact = (id: string, characteristic: string, scopeText = "весь отель"): Fact => ({
  id,
  characteristic,
  group: characteristic,
  statement: id,
  scopeText,
  confidence: 0.8,
  source: "computed",
  sourceLabel: "Расчёт",
  method: "Проверка",
  sources: [],
  caveats: "",
  history: "",
});
describe("hotel highlights", () => {
  it("keeps the requested facade and warning while showing distinct topics", () => {
    const selected = { ...fact("sea-sw", "sea_view", "ЮЗ, 4 этаж"), status: "conflict" as const };
    const facts = [
      fact("sea-ne", "sea_view", "СВ, 2 этаж"),
      selected,
      fact("sunset", "sunset_over_sea"),
      fact("quiet", "night_noise"),
      fact("beach", "beach_walk"),
      fact("work", "remote_work"),
    ];
    const result = selectHotelHighlights(facts, [selected.id]);
    expect(result.map((item) => item.id)).toEqual(["sea-sw", "quiet", "beach", "work"]);
    expect(result[0]).toBe(selected);
    expect(facts).toHaveLength(6);
  });
  it("prioritizes selected facts beyond the default topics", () => {
    const facts = [
      fact("view", "sea_view"),
      fact("quiet", "night_noise"),
      fact("beach", "beach_walk"),
      fact("work", "remote_work"),
      fact("access", "step_free"),
    ];
    expect(selectHotelHighlights(facts, ["access"]).map((item) => item.id)).toEqual([
      "access",
      "view",
      "quiet",
      "beach",
    ]);
  });
  it("handles missing and repeated characteristics without inventing facts", () => {
    expect(selectHotelHighlights([])).toEqual([]);
    const facts = [fact("a", "new_key"), fact("b", "new_key"), fact("c", "another_key")];
    expect(selectHotelHighlights(facts, ["missing"]).map((item) => item.id)).toEqual(["a", "c"]);
  });
  it("keeps multiple requested facts from the same topic", () => {
    const facts = [
      fact("view", "sea_view"),
      fact("kids", "playground_walk"),
      fact("pets", "pets_policy"),
      fact("quiet", "night_noise"),
      fact("beach", "beach_walk"),
    ];
    expect(selectHotelHighlights(facts, ["kids", "pets"]).map((item) => item.id)).toEqual([
      "kids",
      "pets",
      "view",
      "quiet",
    ]);
  });
});
