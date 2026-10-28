import { api, type components } from "@/shared/api";
import type { Criterion, Fact, Hotel } from "../model/types";

export type ApiHotel = components["schemas"]["HotelOut"];
export type ApiFact = components["schemas"]["FactOut"];
export type ApiMatch = components["schemas"]["HotelMatchOut"];
export type ApiIntent = components["schemas"]["IntentModel"];

export const criterionKeys: Record<Criterion, string> = {
  quiet: "night_noise",
  sunset: "sunset_over_sea",
  sea: "sea_view",
  work: "remote_work",
  kids: "playground_walk",
  pets: "pets_policy",
  mountains: "mountain_view",
  infra: "food_late",
};

export function factFromApi(fact: ApiFact): Fact {
  return {
    id: fact.id,
    label: fact.statement,
    value: fact.scopeText,
    confidence: fact.confidence,
    status:
      fact.status === "conflict"
        ? "conflict"
        : fact.status === "stale"
          ? "assumed"
          : fact.source === "hotelier"
            ? "confirmed"
            : fact.source === "demo_card"
              ? "assumed"
              : "computed",
    source: fact.sourceLabel,
    checkedAt: new Date(fact.observedAt).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }),
    note: [...fact.caveats, ...(fact.isDemo ? ["Демонстрационные данные"] : [])].join(" · "),
  };
}

function probability(fact: ApiFact | undefined): number | null {
  if (!fact || fact.status !== "ok") return null;
  if (typeof fact.value === "boolean") return fact.value ? fact.confidence : 1 - fact.confidence;
  return null;
}

export function hotelFromApi(raw: ApiHotel, match?: ApiMatch, intent?: ApiIntent): Hotel {
  const scores = {} as Record<Criterion, number>;
  const unknownCriteria: Criterion[] = [];
  for (const criterion of Object.keys(criterionKeys) as Criterion[]) {
    const key = criterionKeys[criterion];
    const chip = intent?.chips.find((item) => item.characteristic === key);
    const result = chip && match?.perChip.find((item) => item.chipId === chip.id);
    const p = result
      ? (result.probability ?? null)
      : probability(raw.facts.find((fact) => fact.characteristic === key));
    scores[criterion] = p === null ? 0 : Math.round(p * 100);
    if (p === null) unknownCriteria.push(criterion);
  }
  const walk: Hotel["walk"] = [];
  for (const fact of raw.facts) {
    if (!fact.value || typeof fact.value !== "object" || Array.isArray(fact.value)) continue;
    const value = fact.value as Record<string, unknown>;
    if (fact.characteristic === "beach_walk" && typeof value["minutes"] === "number") {
      walk.push({ name: "Пляж", minutes: Math.round(value["minutes"]), kind: "beach" });
    }
  }
  const statement = (key: string) =>
    raw.facts.find((fact) => fact.characteristic === key)?.statement ?? "Пока не известно";
  const noise = raw.facts.flatMap((fact) =>
    fact.evidence
      .filter((e) => e.kind === "noise_facades")
      .flatMap((e) => (typeof e.params?.["indexDb"] === "number" ? [e.params["indexDb"]] : [])),
  );
  return {
    backend: raw,
    ...(match ? { searchMatch: match } : {}),
    unknownCriteria,
    id: raw.id,
    name: raw.name,
    district: raw.area,
    address: raw.address || raw.area,
    image: "/hotel-placeholder.svg",
    gallery: ["/hotel-placeholder.svg"],
    price: match?.recommendation?.priceDemo ?? raw.priceFromDemo ?? 0,
    rating: raw.demo.rating,
    reviewCount: 0,
    stars: raw.stars ?? 0,
    lngLat: raw.location,
    tagline: match?.tradeoff ?? raw.demo.tagline,
    description: raw.demo.tagline,
    scores,
    noise,
    views: [],
    sunsetAzimuth: 0,
    walk,
    audiences: {
      kids: statement("playground_walk"),
      pets: statement("pets_policy"),
      work: statement("remote_work"),
    },
    floors: [{ range: `1–${raw.floors}`, note: "Этажность по открытым данным", good: true }],
    discovered: raw.facts.map((fact) => fact.statement),
    facts: raw.facts.map(factFromApi),
    pros:
      match?.perChip.filter((item) => item.verdict === "yes").map((item) => item.line) ??
      raw.demo.amenities,
    cons: match?.tradeoff
      ? [match.tradeoff]
      : raw.facts.filter((fact) => fact.status !== "ok").map((fact) => fact.statement),
  };
}

export const catalogQuery = {
  queryKey: ["hotels", "catalog"],
  queryFn: ({ signal }: { signal: AbortSignal }) => api<ApiHotel[]>("/hotels", { signal }),
  staleTime: 60000,
};

export function hotelQuery(id: string) {
  return {
    queryKey: ["hotels", id],
    queryFn: async ({ signal }: { signal: AbortSignal }) =>
      hotelFromApi(await api<ApiHotel>(`/hotels/${encodeURIComponent(id)}`, { signal })),
    staleTime: 30000,
  };
}
