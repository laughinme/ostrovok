import type { CoastMapProps } from "./types";

type Item = CoastMapProps["items"][number];
export type HotelCluster = { key: string; items: Item[]; center: [number, number] };

export function clusterHotels(items: Item[], zoom: number, active?: string | null): HotelCluster[] {
  const groups = new Map<string, Item[]>();
  const world = 512 * 2 ** Math.floor(zoom);
  for (const item of items) {
    const [lng, lat] = item.hotel.lngLat;
    const sine = Math.sin((Math.min(85, Math.max(-85, lat)) * Math.PI) / 180);
    const x = ((lng + 180) / 360) * world;
    const y = (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * world;
    const key =
      zoom >= 15 || item.hotel.id === active
        ? item.hotel.id
        : `${Math.floor(x / 64)}:${Math.floor(y / 64)}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups, ([key, grouped]) => ({
    key,
    items: grouped,
    center: [
      grouped.reduce((sum, item) => sum + item.hotel.lngLat[0], 0) / grouped.length,
      grouped.reduce((sum, item) => sum + item.hotel.lngLat[1], 0) / grouped.length,
    ],
  }));
}
