import { describe, expect, it } from "vitest";
import { hotelFromApi, type ApiFact, type ApiHotel } from "@/entities/hotel";
import { apiHotelDetails, detailFactFromApi } from "./api-hotel-details";

const hotel: ApiHotel = {
  id: "hotel",
  osmId: "way/1",
  name: "Hotel",
  area: "Сочи",
  address: "",
  location: [39, 43],
  floors: 4,
  facades: ["N", "E", "S", "W"],
  demo: { rating: 9, ratingLabel: "Демо", tagline: "", amenities: [] },
  rooms: [],
  facts: [],
  unknowns: [],
  nearby: [
    {
      kind: "pharmacy",
      title: "Аптека",
      name: "Здоровье",
      distanceM: 350,
      distanceText: "350 м по прямой",
      location: [39, 43],
    },
  ],
};
describe("API hotel detail", () => {
  it("preserves evidence status and demo attribution independently of confidence", () => {
    const fact: ApiFact = {
      id: "fact",
      hotelId: "hotel",
      characteristic: "sea_view",
      statement: "Моря из окна не видно",
      scopeText: "Северная сторона · этаж 1",
      value: false,
      scope: {},
      confidence: 0.98,
      confidenceLabel: "точно",
      source: "computed",
      sourceLabel: "Расчёт горизонта",
      method: "Расчёт",
      observedAt: "2026-10-28",
      status: "conflict",
      evidence: [],
      caveats: ["Вид зависит от этажа"],
      isDemo: true,
    };
    expect(detailFactFromApi(fact)).toMatchObject({
      statement: fact.statement,
      scopeText: fact.scopeText,
      confidence: 0.98,
      status: "conflict",
      isDemo: true,
      sourceLabel: fact.sourceLabel,
    });
  });
  it("keeps cardinal facades without borrowing diagonal noise", () => {
    const detail = apiHotelDetails(hotelFromApi(hotel));
    expect(detail.bestFacade).toBe("N");
    expect(detail.noise.night.N[1]).toBe("нет данных");
    expect(detail.noise.night.NE[1]).toBe("нет данных");
    expect(Object.values(detail.noise.night).every((value) => value[1] === "нет данных")).toBe(
      true,
    );
  });
  it("keeps nearby title, name and straight-line distance", () => {
    expect(apiHotelDetails(hotelFromApi(hotel)).nearby).toEqual([
      ["pin", "Аптека · Здоровье", "350 м по прямой"],
    ]);
  });
});
