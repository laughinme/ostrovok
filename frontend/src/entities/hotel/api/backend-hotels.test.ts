import { describe, expect, it, vi } from "vitest";
import { getApiMode } from "@/shared/api";
import { hotelFromApi, type ApiHotel } from "./backend-hotels";

vi.mock("@/shared/api", async (original) => ({
  ...(await original<typeof import("@/shared/api")>()),
  getApiMode: vi.fn(() => "live"),
}));

const raw: ApiHotel = {
  id: "demo-zakatnyi-bereg",
  name: "Объект из API",
  osmId: "node/42",
  area: "Сочи",
  address: "",
  location: [39.7, 43.6],
  floors: 3,
  facades: ["S"],
  rooms: [],
  facts: [],
  unknowns: [],
  nearby: [],
  demo: {
    rating: 9,
    ratingLabel: "Демо",
    tagline: "Вымышленное описание",
    amenities: ["Синтетический бассейн"],
  },
};

describe("live catalog presentation", () => {
  it("does not attach demo photos, reviews, descriptions or amenities to API hotels", () => {
    vi.mocked(getApiMode).mockReturnValue("live");
    const hotel = hotelFromApi(raw);
    expect(hotel.image).toBe("/hotel-placeholder.svg");
    expect(hotel.reviewCount).toBe(0);
    expect(hotel.description).not.toContain("Вымышленное");
    expect(hotel.pros).not.toContain("Синтетический бассейн");
    expect(hotel.unknownCriteria).toHaveLength(8);
  });
});
