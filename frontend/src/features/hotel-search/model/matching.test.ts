import { describe, expect, it } from "vitest";
import { parseQuery, rank } from "./matching";

describe("query matching", () => {
  it("understands quiet + sunset + sea", () => {
    expect(parseQuery("Хочу тихий отель с видом на закат, недалеко от моря")).toEqual([
      "quiet",
      "sunset",
      "sea",
    ]);
  });
  it("ranks the mountain chalet first for mountains", () => {
    expect(rank(parseQuery("вид на горы"))[0]!.hotel.id).toBe("gornyi-priyut");
  });
  it("ranks the guesthouse first for dogs", () => {
    expect(rank(parseQuery("отпуск с собакой"))[0]!.hotel.id).toBe("dom-na-holme");
  });
});
