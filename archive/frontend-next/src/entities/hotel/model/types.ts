import type { Facade, SourceKind, Verdict } from '@/shared/model';

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
  sources: [string, string][];
  caveats: string;
  history: string;
  evidence?: 'horizon' | 'noise' | 'route' | 'map';
}

export interface RatePlan {
  meal: string;
  cancel: string;
  pay: string;
  price: number;
  tag?: string;
}

export interface RoomType {
  id: string;
  name: string;
  area: number;
  bed: string;
  facades: Facade[];
  floors: [number, number];
  view: string;
  photo: string;
  forYou: [Verdict, string][];
  recommended?: boolean;
  request?: string;
  rates: RatePlan[];
}

export interface Hotel {
  id: string;
  name: string;
  stars: number;
  district: string;
  address: string;
  lngLat: [number, number];
  toCenter: string;
  toSea: string;
  rating: number;
  ratingLabel: string;
  tagline: string;
  photos: string[];
  bestFloor: number;
  bestFacade: Facade;
  priceFrom: number;
  bestRoom: string;
  tradeoff: string;
  /** вероятность, что желание выполняется, и строка объяснения */
  wish: Record<string, [number, string]>;
  amenities: string[];
  nearby: [string, string, string][];
  rooms: RoomType[];
  facts: Fact[];
  unknowns: [string, string][];
}

export interface HotelMatch {
  hotel: Hotel;
  score: number;
  risk: number;
}
