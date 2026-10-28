import type { Hotel } from "@/entities/hotel";
import { api, type components } from "@/shared/api";

export type Improvement = components["schemas"]["Improvement"];
export type SimilarResult = components["schemas"]["SimilarOut"];
export type SimilarMatch = components["schemas"]["HotelMatchOut"];

export const IMPROVEMENTS: { value: Improvement; label: string; explanation: string }[] = [
  { value: "quieter", label: "Тише ночью", explanation: "Выше вероятность тихой ночи" },
  { value: "closer_to_beach", label: "Ближе к пляжу", explanation: "Короче пешком до пляжа" },
  { value: "cheaper", label: "Дешевле", explanation: "Ниже цена подобранного номера" },
];

export function similarRequest(
  hotel: Hotel,
  change: Improvement,
): components["schemas"]["SimilarIn"] {
  return {
    change,
    chips: hotel.searchContext?.chips ?? [],
    ...(hotel.searchContext ? { trip: hotel.searchContext.trip } : {}),
  };
}

export function similarQuery(hotel: Hotel, change: Improvement | null) {
  const body = change ? similarRequest(hotel, change) : null;
  return {
    queryKey: ["similar-hotels", hotel.id, body],
    enabled: body !== null,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<SimilarResult>(`/hotels/${encodeURIComponent(hotel.id)}/similar`, {
        method: "POST",
        body,
        signal,
      }),
    retry: false,
    refetchOnWindowFocus: false,
  };
}

export function sharedReasons(match: SimilarMatch) {
  return match.perChip
    .filter((result) => result.chipId !== "improve" && result.verdict === "yes" && result.factId)
    .sort((a, b) => Number(b.chipId.startsWith("like:")) - Number(a.chipId.startsWith("like:")))
    .slice(0, 2);
}

export function factQuery(id: string | null | undefined) {
  return {
    queryKey: ["fact", id],
    enabled: !!id,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      api<components["schemas"]["FactDetailOut"]>(`/facts/${encodeURIComponent(id!)}`, { signal }),
    retry: false,
  };
}
