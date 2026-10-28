import type { GeoFacade } from "./geo";

export const NOISE_FACADE_NAMES: Record<GeoFacade, string> = {
  N: "Север",
  NE: "Северо-восток",
  E: "Восток",
  SE: "Юго-восток",
  S: "Юг",
  SW: "Юго-запад",
  W: "Запад",
  NW: "Северо-запад",
};

export function noiseIndexLabel(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "Нет расчёта";
  return value >= 55 ? "Повышенный индекс" : value >= 43 ? "Умеренный индекс" : "Низкий индекс";
}

export function facadeRotation(angle: number) {
  return Math.atan2(7, 8) - Math.PI + (angle * Math.PI) / 180;
}
