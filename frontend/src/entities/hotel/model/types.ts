import type { components } from "@/shared/api";

export type Criterion =
  "quiet" | "sunset" | "sea" | "work" | "kids" | "pets" | "mountains" | "infra";
export type FactStatus = "confirmed" | "computed" | "assumed" | "conflict";

export interface Fact {
  id?: string;
  label: string;
  value: string;
  confidence: number;
  status: FactStatus;
  source: string;
  checkedAt: string;
  note?: string | undefined;
}

export interface Hotel {
  backend?: components["schemas"]["HotelOut"];
  searchMatch?: components["schemas"]["HotelMatchOut"];
  searchContext?: { id: string; trip: components["schemas"]["TripModel"] };
  unknownCriteria?: Criterion[];
  id: string;
  name: string;
  district: string;
  address: string;
  image: string;
  gallery: string[];
  price: number;
  rating: number;
  reviewCount: number;
  stars: number;
  lngLat: [number, number];
  tagline: string;
  description: string;
  scores: Record<Criterion, number>;
  noise: number[];
  views: { from: number; to: number; label: string }[];
  sunsetAzimuth: number;
  walk: {
    name: string;
    minutes: number;
    kind: "beach" | "transport" | "park" | "shop" | "food" | "kids";
  }[];
  audiences: { kids: string; pets: string; work: string };
  floors: { range: string; note: string; good: boolean }[];
  discovered: string[];
  facts: Fact[];
  pros: string[];
  cons: string[];
}
