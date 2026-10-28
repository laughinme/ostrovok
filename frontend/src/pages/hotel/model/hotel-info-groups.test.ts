import { describe, expect, it } from "vitest";
import { groupHotelInfo } from "./hotel-info-groups";
import type { Fact } from "./types";
const makeFact = (id: string, characteristic: string): Fact => ({
  id,
  characteristic,
  group: characteristic,
  statement: id,
  scopeText: "СВ, 4 этаж",
  confidence: 0.8,
  source: "computed",
  sourceLabel: "Расчёт",
  method: "Проверка",
  sources: [],
  caveats: "",
  history: "",
});
describe("hotel information groups", () => {
  it("keeps every amenity and fact, including unknown and repeated items", () => {
    const facts = [
      makeFact("quiet-ne", "night_noise"),
      makeFact("quiet-sw", "night_noise"),
      makeFact("custom", "new_characteristic"),
    ];
    const amenities = ["Wi-Fi", "Wi-Fi", "Завтрак", "Неизвестное удобство"];
    const groups = groupHotelInfo(amenities, facts);
    const items = groups.flatMap((group) => group.items);
    expect(items.filter((item) => item.kind === "amenity")).toHaveLength(amenities.length);
    expect(
      items
        .filter((item) => item.kind === "fact")
        .map((item) => item.id)
        .sort(),
    ).toEqual(facts.map((fact) => fact.id).sort());
    expect(groups.find((group) => group.key === "other")?.items[0]?.id).toBe("custom");
    expect(groups.find((group) => group.key === "quiet")?.items).toHaveLength(2);
  });
  it("places known amenities in their categories without inventing empty sections", () => {
    const groups = groupHotelInfo(
      ["Wi-Fi", "Семейные номера", "Душ", "Холодильник", "Завтрак", "Кондиционер", "Парковка"],
      [],
    );
    expect(groups.map((group) => group.key)).toEqual([
      "work",
      "family",
      "food",
      "room",
      "bathroom",
      "kitchen",
      "general",
    ]);
    expect(groupHotelInfo([], [])).toEqual([]);
  });
});
