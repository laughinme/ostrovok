import {
  CRITERIA,
  criterionKeys,
  hotels,
  type ApiFact,
  type ApiHotel,
  type Criterion,
} from "@/entities/hotel";
import type { components } from "@/shared/api";

export const DEMO_DATE = "2026-10-28T10:00:00Z";
const criteria = Object.keys(criterionKeys) as Criterion[];

export const demoHotels: ApiHotel[] = hotels.map((hotel, index) => {
  const id = `demo-${hotel.id}`;
  const floors = index === 1 ? 4 : 8;
  const beach = hotel.walk.find((place) => place.kind === "beach");
  const beachMinutes = beach?.minutes ?? 660;
  const beachDistance = beachMinutes * 70;
  const beachLocation: [number, number] = beach
    ? [hotel.lngLat[0] - beachDistance / 100000, hotel.lngLat[1] - beachDistance / 140000]
    : [39.919, 43.417];
  const facts: ApiFact[] = criteria.map((criterion) => {
    const score = hotel.scores[criterion] / 100;
    const unknown = index === 2 && criterion === "work";
    return {
      id: `${id}:${criterionKeys[criterion]}`,
      hotelId: id,
      characteristic: criterionKeys[criterion],
      statement: `${CRITERIA[criterion].label}: ${unknown ? "нужно уточнить" : score >= 0.5 ? "скорее подходит" : "есть компромисс"}`,
      scopeText: "Демонстрационный сценарий · юго-западная сторона, 4–8 этажи",
      scope: { facades: ["SW"], floorFrom: 4, floorTo: floors },
      value: score >= 0.5,
      confidence: Math.max(score, 1 - score),
      confidenceLabel: score >= 0.8 ? "точно" : "скорее да",
      source: "demo_card",
      sourceLabel: "Данные для проверки дизайна",
      method: "Локальная имитация ответа; LLM не вызывается",
      observedAt: DEMO_DATE,
      status: unknown ? "stale" : "ok",
      evidence:
        criterion === "quiet"
          ? ["day", "night"].flatMap((period) =>
              ["NE", "SE", "SW", "NW"].map((facade, i) => ({
                kind: "noise_facades" as const,
                summary: "Синтетический шум для проверки визуализации",
                attribution: "Демо-сценарий · не измерение шума",
                params: {
                  facade,
                  period,
                  indexDb:
                    Math.min(...hotel.noise) + [0, 12, 3, 8][i]! + (period === "day" ? 6 : 0),
                },
              })),
            )
          : [],
      caveats: ["Только для проверки интерфейса. Это не сведения о реальном отеле."],
      isDemo: true,
    };
  });
  facts.push({
    id: `${id}:beach_walk`,
    hotelId: id,
    characteristic: "beach_walk",
    statement: "Пешком до пляжа",
    scopeText: "Демонстрационный маршрут",
    scope: {},
    value: { minutes: beachMinutes },
    confidence: 0.85,
    confidenceLabel: "скорее да",
    source: "demo_card",
    sourceLabel: "Данные для проверки дизайна",
    method: "Локальный сценарий",
    observedAt: DEMO_DATE,
    status: "ok",
    evidence: [],
    caveats: ["Маршрут демонстрационный"],
    isDemo: true,
  });
  return {
    id,
    osmId: index === 0 ? "node/1521215547" : `demo/${index}`,
    name: hotel.name,
    stars: hotel.stars,
    area: hotel.district,
    address: hotel.address,
    location: hotel.lngLat,
    floors,
    facades: ["NE", "SE", "SW", "NW"],
    priceFromDemo: hotel.price,
    demo: {
      rating: hotel.rating,
      ratingLabel: "Демо-оценка",
      tagline: hotel.tagline,
      amenities: ["Wi-Fi", "Завтрак", "Кондиционер", "Парковка", "Семейные номера"],
    },
    rooms: [
      {
        id: `${id}:standard`,
        name: "Стандарт с видом на море",
        area: 24,
        bed: "Двуспальная кровать",
        capacity: 2,
        facades: ["SW", "SE"],
        floors: [3, floors],
        confirmedByHotel: true,
        rates: [
          {
            id: `${id}:flex`,
            meal: "С завтраком",
            cancel: "Бесплатная отмена за 3 дня",
            pay: "Оплата в отеле",
            priceDemo: hotel.price,
            tag: "Демо-тариф",
          },
          {
            id: `${id}:basic`,
            meal: "Без питания",
            cancel: "Без возврата",
            pay: "Оплата при бронировании",
            priceDemo: Math.round(hotel.price * 0.85),
          },
        ],
      },
      {
        id: `${id}:family`,
        name: "Семейный номер",
        area: 36,
        bed: "Кровать и раскладной диван",
        capacity: 4,
        facades: ["NE", "NW"],
        floors: [2, floors],
        confirmedByHotel: false,
        rates: [
          {
            id: `${id}:family-flex`,
            meal: "С завтраком",
            cancel: "Бесплатная отмена за 3 дня",
            pay: "Оплата в отеле",
            priceDemo: Math.round(hotel.price * 1.3),
          },
        ],
      },
    ],
    facts,
    unknowns: [
      {
        characteristic: "remote_work",
        question: "Есть ли рабочий стол и стабильный Wi-Fi в номере?",
        why: "Уточним оснащение выбранной категории перед поездкой",
      },
      {
        characteristic: "pets_policy",
        question: "Можно ли приехать с питомцем?",
        why: "Уточним ограничения по весу и доплату за размещение",
      },
    ],
    nearby: [
      {
        kind: "beach",
        title: "Пляж",
        name: beach?.name ?? "Адлерский пляж",
        distanceM: beachDistance,
        distanceText: beach ? `${beachMinutes} мин пешком` : "Около 46 км · нужен транспорт",
        location: beachLocation,
      },
      ...hotel.walk
        .filter((place) => place.kind !== "beach")
        .map((place, placeIndex) => ({
          kind:
            (
              { transport: "station", shop: "grocery", kids: "playground" } as Record<
                string,
                string
              >
            )[place.kind] ?? place.kind,
          title: "",
          name: place.name,
          distanceM: place.minutes * 70,
          distanceText: `${place.minutes} мин пешком`,
          location: [
            hotel.lngLat[0] + 0.001 * (placeIndex + 1),
            hotel.lngLat[1] + 0.0006 * (placeIndex + 1),
          ] as [number, number],
        })),
    ],
  };
});

export const demoQuestions: components["schemas"]["QuestionOut"][] = [
  {
    id: "demo-question-pets",
    hotelId: demoHotels[0]!.id,
    characteristic: "pets_policy",
    text: "Можно ли приехать с собакой до 15 кг?",
    why: "Гость уточняет условия размещения с питомцем",
    value: 0.8,
    answerKind: "free_text",
    options: [],
    status: "open",
  },
  {
    id: "demo-question-work",
    hotelId: demoHotels[0]!.id,
    characteristic: "remote_work",
    text: "Есть ли рабочий стол и стабильный Wi-Fi в номере?",
    why: "Гость планирует работать во время поездки",
    value: 0.7,
    answerKind: "free_text",
    options: [],
    status: "open",
  },
];
