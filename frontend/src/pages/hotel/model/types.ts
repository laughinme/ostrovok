export type Verdict = "yes" | "partial" | "no" | "unknown";
export type SourceKind = "computed" | "open_data" | "hotelier" | "guest" | "demo_card";
export type Facade = import("@/shared/api").components["schemas"]["Facade"];
export type Importance = "must" | "important" | "nice";
export type Checkable = "compute" | "ask_hotelier" | "cannot";
export interface Scope {
  facades?: Facade[];
  floorFrom?: number;
  floorTo?: number;
  months?: number[];
  roomTypeIds?: string[];
}
export interface Fact {
  id: string;
  characteristic: string;
  group: string;
  statement: string;
  scopeText: string;
  confidence: number;
  source: SourceKind;
  sourceLabel: string;
  method: string;
  observedAt?: string;
  sources: [string, string, string?][];
  caveats: string;
  history: string;
  evidence?: "horizon" | "noise" | "route" | "map";
  evidenceItems?: { summary: string; attribution: string }[];
}
export interface Characteristic {
  key: string;
  label: string;
  checkable: Checkable;
  how: string;
}
export interface IntentChip {
  key: string;
  importance: Importance;
}
export interface RatePlan {
  id?: string;
  meal: string;
  cancel: string;
  pay: string;
  price: number;
  tag?: string;
}
export interface RoomType {
  capacity?: number;
  id: string;
  name: string;
  area: number;
  bed: string;
  facades: Facade[];
  orientationLabel?: string;
  floors: [number, number];
  view: string;
  photo: string;
  forYou: [Verdict, string][];
  recommended?: boolean;
  request?: string;
  rates: RatePlan[];
}
export interface HotelDetails {
  api?: boolean;
  totalFloors: number;
  noise: Record<"night" | "day", Record<Facade, [string, string, string]>>;
  id: string;
  name: string;
  stars: number;
  district: string;
  address: string;
  lngLat: [number, number];
  toCenter: string;
  toSea: string;
  rating: number;
  reviewCount: number;
  ratingLabel: string;
  tagline: string;
  photos: string[];
  bestFloor: number;
  bestFacade: Facade;
  priceFrom: number;
  bestRoom: string;
  tradeoff: string;
  wish: Record<string, [number | null, string]>;
  amenities: string[];
  nearby: [string, string, string][];
  rooms: RoomType[];
  facts: Fact[];
  unknowns: { key: string | null; question: string; why: string }[];
}
export interface HotelMatch {
  hotel: HotelDetails;
  score: number;
  risk: number;
}
export interface NearbyRoute {
  destination: string;
  minutes: number;
  stops: [string, string][];
}
