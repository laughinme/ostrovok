import { describe, expect, it } from "vitest";
import { demoHotels } from "./fixtures";
import { demoSimilar } from "./similar";

describe("demo similar hotels", () => {
  it.each(["quieter", "closer_to_beach", "cheaper"] as const)(
    "only returns improvements for %s",
    (change) => {
      let count = 0;
      for (const source of demoHotels) {
        const result = demoSimilar(source, demoHotels, { change });
        expect(result.matches.every((match) => match.hotelId !== source.id)).toBe(true);
        for (const match of result.matches) {
          count++;
          const candidate = demoHotels.find((hotel) => hotel.id === match.hotelId)!;
          if (change === "cheaper")
            expect(candidate.priceFromDemo!).toBeLessThan(source.priceFromDemo!);
          else if (change === "closer_to_beach") {
            const minutes = (hotel: typeof source) =>
              (
                hotel.facts.find((fact) => fact.characteristic === "beach_walk")!.value as {
                  minutes: number;
                }
              ).minutes;
            expect(minutes(candidate)).toBeLessThan(minutes(source));
            expect(match.perChip.find((chip) => chip.chipId === "improve")?.factId).toBeTruthy();
          } else {
            const quiet = (hotel: typeof source) =>
              hotel.facts.find((fact) => fact.characteristic === "night_noise")!.confidence;
            expect(quiet(candidate)).toBeGreaterThan(quiet(source));
          }
        }
      }
      expect(count).toBeGreaterThan(0);
    },
  );

  it("keeps dates and wishes while respecting budget and room capacity", () => {
    const source = demoHotels[0]!;
    const request = {
      change: "cheaper" as const,
      trip: { from: "2026-12-10", to: "2026-12-15", adults: 2, children: 1, budgetPerNight: 8000 },
      chips: [
        {
          id: "custom",
          label: "Питомец",
          characteristic: "pets_policy",
          importance: "must" as const,
          checkable: "ask_hotelier" as const,
          fromProfile: false,
        },
      ],
    };
    const result = demoSimilar(source, demoHotels, request);
    expect(result.intent.trip).toEqual(request.trip);
    expect(result.intent.chips).toContainEqual(request.chips[0]);
    for (const match of result.matches) {
      const candidate = demoHotels.find((hotel) => hotel.id === match.hotelId)!;
      expect(candidate.priceFromDemo!).toBeLessThanOrEqual(8000);
      expect(candidate.rooms.some((room) => room.capacity >= 3)).toBe(true);
    }
    expect(
      demoSimilar(source, demoHotels, { ...request, trip: { budgetPerNight: 1 } }).matches,
    ).toEqual([]);
    expect(demoSimilar(source, demoHotels, { ...request, trip: { adults: 20 } }).matches).toEqual(
      [],
    );
    expect(result.caveats.join(" ")).toContain("синтетических");
  });
});
