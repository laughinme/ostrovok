import type { ApiHotel } from "@/entities/hotel";
import { ApiError, type components } from "@/shared/api";

type Route = components["schemas"]["RouteOut"];
type Profile = components["schemas"]["WalkProfile"];

export function demoBeachRoute(hotel: ApiHotel, profile = "walk"): Route {
  if (!["walk", "stroller", "wheelchair"].includes(profile))
    throw new ApiError(422, "Неизвестный профиль прогулки");
  const beach = hotel.nearby.find((place) => place.kind === "beach")!;
  const fact = hotel.facts.find((item) => item.characteristic === "beach_walk");
  const minutes = (fact?.value as { minutes: number }).minutes;
  const [lon, lat] = hotel.location;
  const [endLon, endLat] = beach.location;
  const lengthM = beach.distanceM;
  const hill = hotel.id.endsWith("dom-na-holme");
  const startHeight = hill ? 68 : minutes > 60 ? 540 : 12;
  const ascent = hill ? 7 : 2;
  const descent = startHeight + ascent - 2;
  const multiplier = profile === "walk" ? 1 : profile === "stroller" ? 1.25 : 1.5;
  const steps = profile === "walk" && hill ? 42 : 0;
  return {
    hotelId: hotel.id,
    targetRef: `${hotel.id}:demo-beach`,
    targetName: beach.name,
    profile: profile as Profile,
    there: {
      minutes: Math.ceil(minutes * multiplier),
      lengthM,
      climbM: ascent,
      descentM: descent,
      steps,
      crossings: 1,
    },
    back: {
      minutes: Math.ceil((minutes + (hill ? 6 : 1)) * multiplier),
      lengthM,
      climbM: descent,
      descentM: ascent,
      steps,
      crossings: 1,
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [lon, lat],
        [lon + (endLon - lon) * 0.2, lat + (endLat - lat) * 0.4],
        [lon + (endLon - lon) * 0.55, lat + (endLat - lat) * 0.4],
        [lon + (endLon - lon) * 0.55, lat + (endLat - lat) * 0.8],
        [endLon, endLat],
      ],
    },
    elevationProfile: [
      [0, startHeight],
      [Math.round(lengthM * 0.2), startHeight + ascent],
      [Math.round(lengthM * 0.45), startHeight * 0.7],
      [Math.round(lengthM * 0.7), startHeight * 0.3],
      [lengthM, 2],
    ],
    estimated: true,
    uncertainShare: 0.08,
    osmRefs: [],
    attribution: "Демо-данные · локальная схема без загрузки карт",
    caveats: [
      "Демонстрационный маршрут: линия, высоты и время синтетические, для навигации не подходят.",
      ...(minutes > 60 ? ["Отель находится в горах. Для поездки к морю нужен транспорт."] : []),
      ...(profile !== "walk"
        ? ["В демо показан обход ступеней. Доступность пути нужно подтвердить на месте."]
        : []),
    ],
  };
}

export function demoNoise(hotel: ApiHotel): components["schemas"]["NoiseOut"] {
  const evidence = hotel.facts.find((fact) => fact.characteristic === "night_noise")!.evidence;
  return {
    hotelId: hotel.id,
    facades: hotel.facades.map((facade, index) => {
      const level = (period: "day" | "night"): components["schemas"]["NoiseLevelOut"] => {
        const value = evidence.find(
          (item) => item.params?.["facade"] === facade && item.params["period"] === period,
        )!.params!["indexDb"] as number;
        return {
          indexDb: value,
          category: value >= 55 ? "noisy" : value >= 43 ? "moderate" : "quiet",
          confidence: 0.85,
          sources: [
            {
              osmRef: `${hotel.id}:demo-${index}`,
              kind: index === 1 ? "railway" : "road",
              indexDb: value,
              distanceM: 90 + index * 65,
              screened: index === 0 || index === 2,
              orientationLossDb: index === 0 || index === 2 ? 8 : 2,
            },
          ],
        };
      };
      return { facade, day: level("day"), night: level("night") };
    }),
    unmodelledRefs: [],
    completeness: 0.92,
    attribution: "Демо-данные · синтетическая модель шума",
    caveats: ["Условный индекс для демонстрации интерфейса, не измерение шума у реального отеля."],
  };
}

export function demoDirectionRoute(
  hotel: ApiHotel,
  point: [number, number],
  name: string,
  profile = "walk",
): Route {
  const route = demoBeachRoute(hotel, profile);
  const [lon, lat] = hotel.location;
  const knownPlace = hotel.nearby.find(
    (place) => place.location[0] === point[0] && place.location[1] === point[1],
  );
  const distance =
    knownPlace?.distanceM ?? Math.hypot((point[0] - lon) * 80000, (point[1] - lat) * 111000) * 1.3;
  const minutes = Math.max(1, Math.ceil(distance / (profile === "walk" ? 75 : 55)));
  return {
    ...route,
    targetRef: `demo-point:${point.join(",")}`,
    targetName: name,
    there: { ...route.there, lengthM: Math.round(distance), minutes },
    back: { ...route.back, lengthM: Math.round(distance), minutes: minutes + 1 },
    geometry: { type: "LineString", coordinates: [[lon, lat], [lon, point[1]], point] },
    elevationProfile: [
      [0, 12],
      [distance * 0.5, 8],
      [distance, 4],
    ],
  };
}
