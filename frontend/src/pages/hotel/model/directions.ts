import type { Hotel } from "@/entities/hotel";
import type { components } from "@/shared/api";

export type DirectionProfile = components["schemas"]["WalkProfile"];
export type DirectionPlace = Pick<
  components["schemas"]["PlaceOut"],
  "ref" | "name" | "address" | "location"
> & { attribution?: string };

export type DirectionTarget = {
  key: string;
  name: string;
  location?: [number, number];
  preset?: "beach" | "station" | "center";
};

export function directionEndpoint(target: DirectionTarget, profile: DirectionProfile) {
  const params = new URLSearchParams({ profile });
  if (target.preset) return `routes/${target.preset}?${params}`;
  if (!target.location) throw new Error("Выберите адрес назначения");
  params.set("lon", String(target.location[0]));
  params.set("lat", String(target.location[1]));
  params.set("name", target.name.slice(0, 200));
  return `route?${params}`;
}

export function directionPlaces(hotel: Hotel): DirectionPlace[] {
  return (hotel.backend?.nearby ?? []).map((place) => ({
    ref: place.osmRef ?? `${place.kind}:${place.name}`,
    name: place.name || place.title,
    address: [place.title, place.distanceText].filter(Boolean).join(" · "),
    location: place.location,
  }));
}

export function routePrefix(coordinates: [number, number][], progress: number): [number, number][] {
  if (coordinates.length < 2 || progress >= 1) return coordinates;
  const lengths = coordinates
    .slice(1)
    .map((point, i) => Math.hypot(point[0] - coordinates[i]![0], point[1] - coordinates[i]![1]));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * Math.max(0, progress);
  const result: [number, number][] = [coordinates[0]!];
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]!;
    const start = coordinates[i]!;
    const end = coordinates[i + 1]!;
    if (remaining >= length) {
      result.push(end);
      remaining -= length;
      continue;
    }
    const fraction = length ? remaining / length : 0;
    result.push([
      start[0] + (end[0] - start[0]) * fraction,
      start[1] + (end[1] - start[1]) * fraction,
    ]);
    break;
  }
  return result;
}
