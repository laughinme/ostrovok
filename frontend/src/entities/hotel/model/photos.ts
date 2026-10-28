import catalog from "../api/photo-catalog.json";

export interface HotelPhoto {
  src: string;
  kind: "photo" | "ai";
  label: string;
  title: string;
  alt: string;
  author: string;
  license: string | null;
  licenseUrl: string;
  page: string;
  capturedAt: string;
  changes: string;
  note?: string;
}

interface PhotoCatalog {
  assets: Record<string, HotelPhoto>;
  hotels: Record<string, { id: string; gallery: string[]; room: string }>;
  demo: Record<string, string[]>;
}

const data = catalog as PhotoCatalog;
const bySource = new Map(Object.values(data.assets).map((photo) => [photo.src, photo]));
const byHotelId = new Map(Object.values(data.hotels).map((hotel) => [hotel.id, hotel]));

export function photoInfo(src: string | undefined): HotelPhoto | undefined {
  return src ? bySource.get(src) : undefined;
}

export function hotelPhotos(osmId: string): string[] {
  if (osmId.startsWith("demo-")) return demoPhotos(osmId.slice(5));
  return (data.hotels[osmId]?.gallery ?? byHotelId.get(osmId)?.gallery ?? []).flatMap((id) =>
    data.assets[id] ? [data.assets[id].src] : [],
  );
}

export function demoPhotos(id: string): string[] {
  return (data.demo[id]?.length ? data.demo[id] : data.demo["atelier-sochi"])!.map(
    (key) => data.assets[key]!.src,
  );
}

export function hotelRoomPhoto(osmId: string): string | undefined {
  const key = data.hotels[osmId]?.room;
  return key ? data.assets[key]?.src : undefined;
}
