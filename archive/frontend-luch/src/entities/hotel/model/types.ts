export type Criterion =
  "quiet" | "sunset" | "sea" | "work" | "kids" | "pets" | "mountains" | "infra";
export type FactStatus = "confirmed" | "computed" | "assumed" | "conflict";

export interface Fact {
  label: string;
  value: string;
  confidence: number;
  status: FactStatus;
  source: string;
  checkedAt: string;
  note?: string | undefined;
}

export interface Hotel {
  id: string;
  name: string;
  district: string;
  image: string;
  gallery: string[];
  price: number;
  rating: number;
  stars: number;
  pos: { x: number; y: number };
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
