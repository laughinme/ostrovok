import type { RouteData } from "./geo";

export type TravelMode = "walk" | "car" | "transit";
export type RouteDrawing = Pick<RouteData, "geometry" | "targetName"> & { estimated?: boolean };
export interface TravelOption {
  mode: TravelMode;
  minutes: number | null;
  distanceM: number | null;
  drawing?: RouteDrawing;
  pending?: boolean;
  error?: boolean;
  note: string;
}

export function sortTravelOptions(options: TravelOption[]) {
  return options.slice().sort((a, b) => {
    const valid = (value: number | null) =>
      value !== null && Number.isFinite(value) && value >= 0 ? Math.ceil(value) : Infinity;
    return valid(a.minutes) - valid(b.minutes);
  });
}

export function travelTime(minutes: number | null) {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return "Нет расчёта";
  if (minutes < 1) return "< 1 мин";
  const total = Math.ceil(minutes);
  return total < 60
    ? `${total} мин`
    : `${Math.floor(total / 60)} ч${total % 60 ? ` ${total % 60} мин` : ""}`;
}

export function yandexDirections(
  origin: [number, number],
  destination: [number, number],
  mode: TravelMode,
) {
  const params = new URLSearchParams({
    rtext: `${origin[1]},${origin[0]}~${destination[1]},${destination[0]}`,
    rtt: { walk: "pd", car: "auto", transit: "mt" }[mode],
  });
  return `https://yandex.ru/maps/?${params}`;
}

export function drivingOption(payload: unknown, targetName: string): TravelOption {
  const body = payload as {
    code?: unknown;
    routes?: {
      duration?: unknown;
      distance?: unknown;
      geometry?: { type?: unknown; coordinates?: unknown };
    }[];
  };
  const route = Array.isArray(body?.routes) ? body.routes[0] : undefined;
  const points = route?.geometry?.coordinates;
  if (
    body?.code !== "Ok" ||
    typeof route?.duration !== "number" ||
    !Number.isFinite(route.duration) ||
    route.duration < 0 ||
    typeof route.distance !== "number" ||
    !Number.isFinite(route.distance) ||
    route.distance < 0 ||
    route.geometry?.type !== "LineString" ||
    !Array.isArray(points) ||
    points.length < 2 ||
    points.some(
      (point) =>
        !Array.isArray(point) ||
        point.length < 2 ||
        typeof point[0] !== "number" ||
        typeof point[1] !== "number" ||
        !Number.isFinite(point[0]) ||
        !Number.isFinite(point[1]) ||
        Math.abs(point[0]) > 180 ||
        Math.abs(point[1]) > 90,
    )
  )
    throw new Error("Не удалось рассчитать автомобильный маршрут");
  return {
    mode: "car",
    minutes: route.duration / 60,
    distanceM: route.distance,
    drawing: {
      targetName,
      geometry: { type: "LineString", coordinates: points as [number, number][] },
    },
    note: "Без пробок и поиска парковки",
  };
}

export async function fetchDrivingOption(
  origin: [number, number],
  destination: [number, number],
  name: string,
  signal: AbortSignal,
) {
  const coordinates = [origin, destination];
  if (
    coordinates.some(
      ([lon, lat]) =>
        !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90,
    )
  )
    throw new Error("Некорректные координаты маршрута");
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
    alternatives: "false",
    radiuses: "150;300",
  });
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates.map((point) => point.join(",")).join(";")}?${params}`,
    { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]), credentials: "omit" },
  );
  if (!response.ok) throw new Error("Автомобильный маршрут временно недоступен");
  return drivingOption(await response.json(), name);
}

export function demoTravelOption(mode: "car" | "transit", route: RouteData): TravelOption {
  const first = route.geometry.coordinates[0]!,
    last = route.geometry.coordinates.at(-1)!;
  const split = mode === "car" ? 0.7 : 0.35;
  const baseMinutes = route.there.lengthM == null ? route.there.minutes : route.there.lengthM / 75;
  const coordinates: [number, number][] = [
    first,
    [first[0] + (last[0] - first[0]) * split, first[1]],
    [first[0] + (last[0] - first[0]) * split, last[1]],
    last,
  ];
  return {
    mode,
    minutes:
      mode === "car"
        ? Math.max(2, Math.ceil(baseMinutes / 3))
        : Math.max(9, Math.ceil(baseMinutes * 0.65) + 8),
    distanceM: route.there.lengthM,
    drawing: {
      targetName: route.targetName,
      estimated: true,
      geometry: { type: "LineString", coordinates },
    },
    note: "Демо · время и схема условные",
  };
}

let footQueue: Promise<unknown> = Promise.resolve();
let lastFootRequest = 0;

export function fetchWalkingFallback(
  origin: [number, number],
  destination: [number, number],
  name: string,
  signal: AbortSignal,
): Promise<TravelOption> {
  const pending = footQueue
    .catch(() => undefined)
    .then(async () => {
      signal.throwIfAborted();
      const delay = Math.max(0, lastFootRequest + 1100 - Date.now());
      if (delay)
        await new Promise<void>((resolve, reject) => {
          const abort = () => {
            clearTimeout(timer);
            reject(signal.reason);
          };
          const timer = setTimeout(() => {
            signal.removeEventListener("abort", abort);
            resolve();
          }, delay);
          signal.addEventListener("abort", abort, { once: true });
        });
      signal.throwIfAborted();
      lastFootRequest = Date.now();
      const params = new URLSearchParams({
        overview: "full",
        geometries: "geojson",
        steps: "false",
        radiuses: "150;300",
      });
      const response = await fetch(
        `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${origin.join(",")};${destination.join(",")}?${params}`,
        { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]), credentials: "omit" },
      );
      if (!response.ok) throw new Error("Пеший маршрут временно недоступен");
      return {
        ...drivingOption(await response.json(), name),
        mode: "walk" as const,
        note: "Пешеходный маршрут · OSM / FOSSGIS",
      };
    });
  footQueue = pending;
  return pending;
}
