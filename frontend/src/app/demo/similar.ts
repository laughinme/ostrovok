import type { ApiHotel, ApiIntent, ApiMatch } from "@/entities/hotel";
import type { components } from "@/shared/api";
import { demoMatch } from "./search";

const KEEP = new Set(["sea_view", "sunset_over_sea", "mountain_view", "blackout", "ac"]);

function minutes(hotel: ApiHotel): number | null {
  const value = hotel.facts.find((fact) => fact.characteristic === "beach_walk")?.value;
  if (!value || typeof value !== "object" || !("minutes" in value)) return null;
  return typeof value.minutes === "number" ? value.minutes : null;
}

export function demoSimilar(
  source: ApiHotel,
  hotels: ApiHotel[],
  request: components["schemas"]["SimilarIn"],
): components["schemas"]["SimilarOut"] {
  const target = request.change === "quieter" ? "night_noise" : "beach_walk";
  const chips = [...(request.chips ?? [])];
  for (const fact of source.facts) {
    if (
      KEEP.has(fact.characteristic) &&
      fact.value === true &&
      !chips.some((chip) => chip.characteristic === fact.characteristic)
    ) {
      chips.push({
        id: `like:${fact.characteristic}`,
        characteristic: fact.characteristic,
        label: fact.statement,
        importance: "nice",
        checkable: "compute",
        fromProfile: false,
      });
    }
  }
  const intent: ApiIntent = {
    chips:
      request.change === "cheaper"
        ? chips
        : [
            ...chips.filter((chip) => chip.characteristic !== target),
            {
              id: "improve",
              characteristic: target,
              label: request.change === "quieter" ? "Тишина ночью" : "Ближе к пляжу",
              importance: "must",
              checkable: "compute",
              fromProfile: false,
            },
          ],
    trip: request.trip ?? {},
    planner: "rules",
  };
  const baseline = demoMatch(source, intent);
  const quiet = (match: ApiMatch) =>
    match.perChip.find((chip) => chip.chipId === "improve")?.probability;
  const guests = (intent.trip.adults ?? 0) + (intent.trip.children ?? 0);
  const matches = hotels
    .filter((hotel) => {
      if (hotel.id === source.id) return false;
      const price = hotel.priceFromDemo;
      if (
        intent.trip.budgetPerNight != null &&
        (price == null || price > intent.trip.budgetPerNight)
      )
        return false;
      if (guests && !hotel.rooms.some((room) => room.capacity >= guests)) return false;
      if (request.change === "cheaper")
        return price != null && source.priceFromDemo != null && price < source.priceFromDemo;
      if (request.change === "closer_to_beach") {
        const candidate = minutes(hotel),
          original = minutes(source);
        return candidate != null && original != null && candidate < original;
      }
      const candidate = quiet(demoMatch(hotel, intent));
      return candidate != null && candidate > (quiet(baseline) ?? 0.7);
    })
    .map((hotel) => {
      const match = demoMatch(hotel, intent);
      if (request.change === "closer_to_beach") {
        const fact = hotel.facts.find((item) => item.characteristic === "beach_walk")!;
        match.perChip = match.perChip.map((chip) =>
          chip.chipId === "improve"
            ? {
                ...chip,
                factId: fact.id,
                line: fact.statement,
                verdict: "yes",
                probability: fact.confidence,
              }
            : chip,
        );
      }
      return match;
    })
    .sort((a, b) => b.score - a.score);
  return {
    sourceId: source.id,
    change: request.change,
    intent,
    matches,
    caveats: ["Демонстрационный подбор на синтетических данных. Запросы к LLM не выполняются."],
  };
}
