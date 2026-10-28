import { type Criterion, type Hotel } from "@/entities/hotel";
import { apiHotelDetails } from "./api-hotel-details";
import type {
  Facade,
  Fact,
  HotelDetails,
  NearbyRoute,
  RoomType,
  SourceKind,
  Verdict,
} from "./types";
const SOURCE: Record<string, SourceKind> = {
  confirmed: "hotelier",
  computed: "computed",
  assumed: "demo_card",
  conflict: "guest",
};
const verdict = (value: number): Verdict => (value >= 70 ? "yes" : value >= 40 ? "partial" : "no");
const kindIcon: Record<string, string> = {
  beach: "beach",
  transport: "bus",
  park: "park",
  shop: "food",
  food: "food",
  kids: "kid",
};
export function createHotelDetails(hotel: Hotel): HotelDetails {
  if (hotel.backend) return apiHotelDetails(hotel);
  const photos = hotel.gallery.length ? hotel.gallery : [hotel.image];
  const beach = hotel.walk.find((item) => item.kind === "beach");
  const bestFacade: Facade = hotel.scores.mountains > hotel.scores.sea ? "NE" : "SW";
  const floorNumbers = hotel.floors.flatMap(
    (floor) => floor.range.match(/\d+/g)?.map(Number) ?? [],
  );
  const maxFloor = Math.max(3, ...floorNumbers);
  const bestFloor = Math.min(maxFloor, bestFacade === "NE" ? 3 : 6);
  const explanations: Record<Criterion, string> = {
    quiet: `Ночью от ${Math.min(...hotel.noise)} дБ`,
    sunset:
      hotel.views.map((view) => view.label).join(", ") + ` · азимут заката ${hotel.sunsetAzimuth}°`,
    sea: beach
      ? `${beach.name} · ${beach.minutes} мин пешком`
      : "Море далеко: этот отель для отдыха в горах",
    work: hotel.audiences.work,
    kids: hotel.audiences.kids,
    pets: hotel.audiences.pets,
    mountains:
      hotel.scores.mountains >= 70
        ? "Виды на горы с выбранной стороны здания"
        : "Вид на горы ограничен",
    infra: hotel.walk
      .slice(0, 3)
      .map((item) => item.name)
      .join(" · "),
  };
  const room = (
    id: string,
    name: string,
    area: number,
    facade: Facade,
    price: number,
    recommended: boolean,
    photo: string,
  ): RoomType => ({
    id,
    name,
    area,
    bed: "Двуспальная кровать",
    facades: [facade],
    floors: [2, maxFloor],
    view: facade === "NE" ? "горы и двор" : "море и окрестности",
    photo,
    recommended,
    request: `Сторона ${facade === "NE" ? "СВ" : "ЮЗ"} · этаж ${bestFloor} или выше · подальше от лифта`,
    forYou: [
      [verdict(hotel.scores.quiet), explanations.quiet],
      [verdict(hotel.scores.sea), explanations.sea],
    ],
    rates: [
      { meal: "Без питания", cancel: "Условия отмены уточняются", pay: "Оплата в отеле", price },
      {
        meal: "Завтрак включён",
        cancel: "Бесплатная отмена за 7 дней",
        pay: "Оплата при заселении",
        price: price + 1200,
        tag: "Гибкий тариф",
      },
    ],
  });
  const facts: Fact[] = hotel.facts.map((fact, index) => ({
    id: `${hotel.id}-${index}`,
    characteristic: "detail",
    group: fact.label,
    statement: fact.label,
    scopeText: fact.value,
    confidence: fact.confidence,
    source: SOURCE[fact.status] ?? "demo_card",
    sourceLabel: fact.source,
    method: `Оценка из карточки отеля. Источник: ${fact.source}.`,
    sources: [[fact.source, fact.checkedAt]],
    observedAt: fact.checkedAt,
    caveats: fact.note ?? "Данные прототипа: условия нужно подтвердить у отеля перед поездкой.",
    history: `Дата последней проверки: ${fact.checkedAt}.`,
    ...(/окн|вид|закат/i.test(fact.label)
      ? { evidence: "horizon" as const }
      : /шум|тиш/i.test(fact.label)
        ? { evidence: "noise" as const }
        : {}),
  }));
  return {
    totalFloors: maxFloor,
    noise: { night: noiseByFacade(hotel, "night"), day: noiseByFacade(hotel, "day") },
    id: hotel.id,
    name: hotel.name,
    stars: hotel.stars,
    district: hotel.district,
    address: hotel.address,
    lngLat: hotel.lngLat,
    toCenter: hotel.tagline,
    toSea: beach ? `${beach.minutes} мин до пляжа` : "Отдых в горах",
    rating: hotel.rating,
    reviewCount: hotel.reviewCount,
    ratingLabel: hotel.rating >= 9 ? "Превосходно" : "Отлично",
    tagline: hotel.tagline,
    photos,
    bestFloor,
    bestFacade,
    priceFrom: hotel.price,
    bestRoom: bestFacade === "NE" ? "Делюкс с видом на горы" : "Делюкс с видом на море",
    tradeoff: hotel.cons[0] ?? hotel.description,
    wish: Object.fromEntries(
      (Object.keys(hotel.scores) as Criterion[]).map((key) => [
        key,
        [hotel.scores[key] / 100, explanations[key]],
      ]),
    ),
    amenities: hotel.pros.slice(0, 4),
    nearby: hotel.walk.map((item) => [
      kindIcon[item.kind] ?? "pin",
      item.name,
      `${item.minutes} мин`,
    ]),
    rooms: [
      room("standard", "Стандарт", 24, "NE", hotel.price, false, photos[1] ?? hotel.image),
      room(
        "deluxe",
        bestFacade === "NE" ? "Делюкс с видом на горы" : "Делюкс с видом на море",
        32,
        bestFacade,
        hotel.price + 2000,
        true,
        photos[2] ?? hotel.image,
      ),
    ],
    facts,
    unknowns: [
      [
        "Какие номера доступны на выбранном этаже?",
        "Закрепление номера и стороны здания нужно подтвердить у отеля",
      ],
      [
        "Есть ли дополнительная шумоизоляция?",
        "Тип окон и слышимость между номерами не подтверждены",
      ],
      ["Можно ли приехать с питомцем?", hotel.audiences.pets],
    ],
  };
}
export function nearbyRoute(hotel: Hotel): NearbyRoute {
  const destination = hotel.walk.find((item) => item.kind === "beach") ?? hotel.walk[0];
  return {
    destination: destination?.name ?? "Окрестности отеля",
    minutes: destination?.minutes ?? 0,
    stops: hotel.walk.slice(0, 4).map((item) => [item.name, `${item.minutes} мин пешком от отеля`]),
  };
}
export function noiseByFacade(
  hotel: Hotel,
  time: "night" | "day",
): Record<Facade, [string, string, string]> {
  const level = time === "night" ? Math.min(...hotel.noise) : Math.max(...hotel.noise);
  return Object.fromEntries(
    (["SW", "SE", "NE", "NW"] as Facade[]).map((facade, i) => {
      const db = Math.max(25, level + [5, 2, 0, 3][i]!);
      return [
        facade,
        [db >= 55 ? "#D2463B" : db >= 43 ? "#B7860B" : "#1E8F4E", `≈${db} дБ`, "расчёт"],
      ];
    }),
  ) as Record<Facade, [string, string, string]>;
}
