import { describe, expect, it } from "vitest";
import { hotelFromApi, type ApiHotel } from "@/entities/hotel";
import { apiHotelDetails } from "./api-hotel-details";

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
  it("keeps cardinal facades without borrowing diagonal noise", () => {
    const detail = apiHotelDetails(hotelFromApi(hotel));
    expect(detail.bestFacade).toBe("N");
    expect(Object.keys(detail.noise.night)).toEqual(["N", "E", "S", "W"]);
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
