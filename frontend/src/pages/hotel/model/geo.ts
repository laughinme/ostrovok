import type { components } from "@/shared/api";

export type GeoFacade = components["schemas"]["Facade"];
export type WindowData = components["schemas"]["WindowOut"];
export type NoiseData = components["schemas"]["NoiseOut"];
export type RouteData = components["schemas"]["RouteOut"];
export const FACADE_LABEL: Record<GeoFacade, string> = {
  N: "С",
  NE: "СВ",
  E: "В",
  SE: "ЮВ",
  S: "Ю",
  SW: "ЮЗ",
  W: "З",
  NW: "СЗ",
};
export const FACADE_ANGLE: Record<GeoFacade, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};
export function tripDates(trip?: components["schemas"]["TripModel"]) {
  const from = trip?.from ?? "2026-11-10";
  const to = trip?.to ?? new Date(Date.parse(from) + 5 * 86400000).toISOString().slice(0, 10);
  return { from, to, date: trip?.from ?? "2026-11-15", fallback: !trip?.from };
}
export function dateLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
}
export function localTime(at: string, timeZone = "Europe/Moscow") {
  return new Date(at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone });
}
export function numberLabel(value: number | null | undefined, unit = "") {
  return value == null
    ? "нет данных"
    : `${Number(value.toFixed(1)).toLocaleString("ru-RU")}${unit}`;
}
export function noiseFacades(
  facades: GeoFacade[],
  data: NoiseData | undefined,
  period: "day" | "night",
) {
  return facades.map((facade) => {
    const level = data?.facades.find((item) => item.facade === facade)?.[period];
    const value = level?.indexDb;
    return {
      facade,
      level,
      text: numberLabel(value),
      color:
        value == null ? "#5B6580" : value >= 55 ? "#D2463B" : value >= 43 ? "#B7860B" : "#1E8F4E",
    };
  });
}
export function relativeAzimuth(azimuth: number, facade: GeoFacade) {
  return ((azimuth - FACADE_ANGLE[facade] + 540) % 360) - 180;
}
export function solarVisibility(data: WindowData, event: "sunrise" | "sunset") {
  const sun = data[event];
  const rays = data.horizon.map((ray) => ({
    ...ray,
    offset: relativeAzimuth(ray.azimuthDeg, data.facade),
  }));
  if (!rays.length || rays.every((ray) => ray.kind === "unknown")) return "нет данных";
  const offset = relativeAzimuth(sun.azimuthDeg, data.facade);
  if (
    offset < Math.min(...rays.map((ray) => ray.offset)) ||
    offset > Math.max(...rays.map((ray) => ray.offset))
  )
    return "вне окна";
  const ray = rays.reduce((a, b) =>
    Math.abs(a.offset - offset) < Math.abs(b.offset - offset) ? a : b,
  );
  if (ray.angleDeg == null || ray.kind === "unknown") return "нет данных";
  return sun.elevationDeg + 0.2667 > ray.angleDeg ? "виден" : "закрыт горизонтом";
}
export function elevationPath(profile: RouteData["elevationProfile"]) {
  const heights = profile.flatMap(([, height]) => (height == null ? [] : [height]));
  if (!heights.length) return "";
  const low = Math.min(...heights),
    high = Math.max(...heights);
  const length = Math.max(1, ...profile.map(([distance]) => distance));
  let connected = false;
  return profile
    .map(([distance, height]) => {
      if (height == null) {
        connected = false;
        return "";
      }
      const command = connected ? "L" : "M";
      connected = true;
      return `${command}${10 + (distance / length) * 380},${90 - ((height - low) / Math.max(1, high - low)) * 70}`;
    })
    .join(" ");
}
