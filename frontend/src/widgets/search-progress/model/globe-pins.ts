export type GlobePin = { name: string; lat: number; lon: number; main?: boolean };

export const PINS: GlobePin[] = [
  { name: "Берлин", lat: 52.52, lon: 13.4 },
  { name: "Стамбул", lat: 41.01, lon: 28.98 },
  { name: "Казань", lat: 55.79, lon: 49.11 },
  { name: "Тбилиси", lat: 41.72, lon: 44.79 },
  { name: "Дубай", lat: 25.2, lon: 55.27 },
  { name: "Алматы", lat: 43.24, lon: 76.89 },
  { name: "Бангкок", lat: 13.75, lon: 100.5 },
  { name: "Москва", lat: 55.75, lon: 37.62 },
  { name: "Сочи", lat: 43.6, lon: 39.73, main: true },
];

export function pinsLitFor(progress: number) {
  return Math.max(0, Math.min(PINS.length, Math.round(progress * PINS.length)));
}
