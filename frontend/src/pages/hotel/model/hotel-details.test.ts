import { describe, expect, it } from "vitest";
import { hotels } from "@/entities/hotel";
import { createHotelDetails, nearbyRoute } from "./hotel-details";

describe("hotel detail integration", () => {
  it.each(hotels)("keeps the catalogue identity and facts for $name", (hotel) => {
    const detail = createHotelDetails(hotel);
    expect(detail.id).toBe(hotel.id);
    expect(detail.name).toBe(hotel.name);
    expect(detail.photos).toEqual(hotel.gallery);
    expect(detail.lngLat).toEqual(hotel.lngLat);
    expect(detail.priceFrom).toBe(hotel.price);
    expect(detail.rating).toBe(hotel.rating);
    expect(detail.reviewCount).toBe(hotel.reviewCount);
    expect(detail.facts.map((fact) => [fact.statement, fact.scopeText, fact.confidence])).toEqual(
      hotel.facts.map((fact) => [fact.label, fact.value, fact.confidence]),
    );
    expect(Math.min(...detail.rooms.flatMap((room) => room.rates.map((rate) => rate.price)))).toBe(
      hotel.price,
    );
    expect(
      detail.rooms.every(
        (room) => room.floors[0] <= detail.bestFloor && room.floors[1] >= detail.bestFloor,
      ),
    ).toBe(true);
  });

  it("uses a nearby mountain destination when there is no beach", () => {
    const hotel = hotels.find((item) => item.id === "gornyi-priyut")!;
    const destination = nearbyRoute(hotel);
    expect(destination.destination).toBe(hotel.walk[0]!.name);
    expect(destination.stops.every(([name]) => hotel.walk.some((item) => item.name === name))).toBe(
      true,
    );
    expect(createHotelDetails(hotel).bestFacade).toBe("NE");
  });
});
