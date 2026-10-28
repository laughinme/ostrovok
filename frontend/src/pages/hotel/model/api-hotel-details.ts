import type { ApiFact, Hotel } from "@/entities/hotel";
import type { components } from "@/shared/api";
import type { Facade, Fact, HotelDetails } from "./types";

const facades: Facade[] = ["NE", "SE", "SW", "NW"];
const isFacade = (value: string): value is Facade => facades.includes(value as Facade);

export function detailFactFromApi(
  fact: ApiFact,
  detail?: components["schemas"]["FactDetailOut"],
): Fact {
  return {
    id: fact.id,
    characteristic: fact.characteristic,
    group: fact.characteristic,
    statement: fact.statement,
    scopeText: fact.scopeText,
    confidence: fact.confidence,
    source: fact.source,
    sourceLabel: fact.sourceLabel,
    method: fact.method,
    observedAt: fact.observedAt,
    sources: detail?.sources.map((source) => [source.label, source.observedAt]) ?? [
      [fact.sourceLabel, fact.observedAt],
    ],
    caveats:
      [
        ...fact.caveats,
        ...fact.evidence.map((e) => `${e.summary} · ${e.attribution}`),
        ...(fact.isDemo ? ["Демонстрационные данные"] : []),
      ].join(" · ") || "Дополнительных оговорок нет",
    history:
      detail?.history.map((item) => `${item.at}: ${item.statement} · ${item.reason}`).join("\n") ||
      `Последняя проверка: ${fact.observedAt}. Статус: ${fact.status}`,
  };
}

export function apiHotelDetails(hotel: Hotel): HotelDetails {
  const raw = hotel.backend!;
  const recommendation = hotel.searchMatch?.recommendation;
  const scope = recommendation?.scope;
  const recommendedFacades = Array.isArray(scope?.["facades"])
    ? scope["facades"].filter((value): value is string => typeof value === "string")
    : [];
  const bestFacade = recommendedFacades.find(isFacade) ?? raw.facades.find(isFacade) ?? "SW";
  const bestFloor = typeof scope?.["floorFrom"] === "number" ? scope["floorFrom"] : 1;
  const noiseFor = (time: "day" | "night") =>
    Object.fromEntries(
      facades.map((facade) => {
        const evidence = raw.facts
          .flatMap((fact) => fact.evidence)
          .find(
            (e) =>
              e.kind === "noise_facades" &&
              e.params?.["facade"] === facade &&
              e.params?.["period"] === time,
          );
        const value = evidence?.params?.["indexDb"];
        const db = typeof value === "number" ? value : null;
        return [
          facade,
          [
            db === null ? "#5B6580" : db >= 55 ? "#D2463B" : db >= 43 ? "#B7860B" : "#1E8F4E",
            db === null ? "нет данных" : `≈${Math.round(db)} дБ`,
            "условный индекс по OSM",
          ],
        ];
      }),
    ) as HotelDetails["noise"]["night"];
  const beach = hotel.walk.find((place) => place.kind === "beach");
  return {
    api: true,
    totalFloors: raw.floors,
    noise: { day: noiseFor("day"), night: noiseFor("night") },
    id: raw.id,
    name: raw.name,
    stars: raw.stars ?? 0,
    district: raw.area,
    address: raw.address || raw.area,
    lngLat: raw.location,
    toCenter: raw.area,
    toSea: beach ? `${beach.minutes} мин до пляжа` : "Дорога до пляжа пока не известна",
    rating: raw.demo.rating,
    reviewCount: 0,
    ratingLabel: `${raw.demo.ratingLabel} · демо`,
    tagline: raw.demo.tagline,
    photos: hotel.gallery,
    bestFloor,
    bestFacade,
    priceFrom: raw.priceFromDemo ?? 0,
    bestRoom: recommendation?.roomName ?? "Выберите категорию номера",
    tradeoff:
      hotel.searchMatch?.tradeoff ?? "Разметку номера и доступность нужно подтвердить у отеля",
    wish: Object.fromEntries(
      Object.entries(hotel.scores).map(([criterion, score]) => [
        criterion,
        [
          hotel.unknownCriteria?.includes(criterion as keyof Hotel["scores"]) ? null : score / 100,
          raw.facts.find(
            (fact) =>
              fact.characteristic ===
              {
                quiet: "night_noise",
                sunset: "sunset_over_sea",
                sea: "sea_view",
                work: "remote_work",
                kids: "playground_walk",
                pets: "pets_policy",
                mountains: "mountain_view",
                infra: "food_late",
              }[criterion],
          )?.statement ?? "Нет подтверждённых данных",
        ],
      ]),
    ),
    amenities: raw.demo.amenities,
    nearby: hotel.walk.map((place) => ["beach", place.name, `${place.minutes} мин`]),
    rooms: raw.rooms.map((room) => ({
      id: room.id,
      capacity: room.capacity,
      name: room.name,
      area: room.area,
      bed: room.bed,
      facades: room.facades.filter(isFacade),
      floors: room.floors ?? [1, raw.floors],
      view: room.confirmedByHotel
        ? "Сторона подтверждена отелем; вид зависит от этажа"
        : "Размещение и вид не подтверждены отелем",
      photo: "/hotel-placeholder.svg",
      forYou: [],
      recommended: room.id === recommendation?.roomTypeId,
      request:
        recommendation?.request ?? "Пожалуйста, подтвердите сторону здания, этаж и вид из номера",
      rates: room.rates.map((rate) => ({
        id: rate.id,
        meal: rate.meal,
        cancel: rate.cancel,
        pay: rate.pay,
        price: rate.priceDemo,
        ...(rate.tag ? { tag: rate.tag } : {}),
      })),
    })),
    facts: raw.facts.map((fact) => detailFactFromApi(fact)),
    unknowns: raw.unknowns.map((item) => [item.question, item.why]),
  };
}
