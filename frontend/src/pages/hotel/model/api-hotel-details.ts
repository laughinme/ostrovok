import { characteristicLabel, type ApiFact, type Hotel } from "@/entities/hotel";
import type { components } from "@/shared/api";
import type { Facade, Fact, HotelDetails } from "./types";

const facades: Facade[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const isFacade = (value: string): value is Facade => facades.includes(value as Facade);
const observed = (value: string) =>
  Number.isNaN(Date.parse(value))
    ? value
    : new Date(value).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });

export function detailFactFromApi(
  fact: ApiFact,
  detail?: components["schemas"]["FactDetailOut"],
): Fact {
  return {
    id: fact.id,
    characteristic: fact.characteristic,
    group: characteristicLabel(fact.characteristic),
    statement: fact.statement,
    scopeText: fact.scopeText,
    confidence: fact.confidence,
    source: fact.source,
    sourceLabel: fact.sourceLabel,
    method: fact.method,
    observedAt: fact.observedAt,
    sources: detail?.sources.map((source) => [
      source.label,
      observed(source.observedAt),
      source.ref ?? "",
    ]) ?? [[fact.sourceLabel, observed(fact.observedAt)]],
    evidenceItems: Array.from(
      new Map(
        fact.evidence.map((item) => [
          `${item.summary}:${item.attribution}`,
          { summary: item.summary, attribution: item.attribution },
        ]),
      ).values(),
    ),
    caveats:
      [...fact.caveats, ...(fact.isDemo ? ["Демонстрационные данные"] : [])].join(" · ") ||
      "Дополнительных оговорок нет",
    history:
      detail?.history.map((item) => `${item.at}: ${item.statement} · ${item.reason}`).join("\n") ||
      `Последняя проверка: ${observed(fact.observedAt)}. Статус: ${{ ok: "актуально", stale: "нужно перепроверить", conflict: "есть противоречие" }[fact.status]}`,
  };
}

export function apiHotelDetails(hotel: Hotel): HotelDetails {
  const raw = hotel.backend!;
  const recommendation = hotel.searchMatch?.recommendation;
  const scope = recommendation?.scope;
  const recommendedFacades = Array.isArray(scope?.["facades"]) ? scope["facades"] : [];
  const primaryRoom = raw.rooms.find((room) => room.confirmedByHotel) ?? raw.rooms[0];
  const bestFacade =
    recommendedFacades.find(isFacade) ??
    primaryRoom?.facades.find(isFacade) ??
    raw.facades.find(isFacade) ??
    "SW";
  const bestFloor =
    typeof scope?.["floorFrom"] === "number" ? scope["floorFrom"] : (primaryRoom?.floors?.[0] ?? 1);
  const unknownNoise = Object.fromEntries(
    facades.map((facade) => [facade, ["#5B6580", "нет данных", "условный индекс по OSM"]]),
  ) as HotelDetails["noise"]["night"];
  const beach = hotel.walk.find((place) => place.kind === "beach");
  return {
    api: true,
    totalFloors: raw.floors,
    noise: { day: unknownNoise, night: unknownNoise },
    id: raw.id,
    name: raw.name,
    stars: raw.stars ?? 0,
    district: raw.area,
    address: raw.address || raw.area,
    lngLat: raw.location,
    toCenter: raw.area,
    toSea: beach ? `${beach.minutes} мин до пляжа` : "Дорога до пляжа пока не известна",
    rating: raw.demo.rating,
    reviewCount: hotel.reviewCount,
    ratingLabel: raw.demo.ratingLabel,
    tagline: raw.demo.tagline,
    photos: hotel.gallery,
    bestFloor,
    bestFacade,
    priceFrom: hotel.price,
    bestRoom: recommendation?.roomName ?? primaryRoom?.name ?? "Уточним варианты размещения",
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
    nearby: raw.nearby.length
      ? raw.nearby.map((place) => [
          (
            {
              beach: "beach",
              food: "food",
              grocery: "food",
              pharmacy: "pin",
              park: "park",
              playground: "kid",
              station: "bus",
            } as Record<string, string>
          )[place.kind] ?? "pin",
          place.title && place.title !== place.name ? `${place.title} · ${place.name}` : place.name,
          place.distanceText,
        ])
      : hotel.walk.map((place) => ["beach", place.name, `${place.minutes} мин`]),
    rooms: raw.rooms.map((room) => ({
      id: room.id,
      capacity: room.capacity,
      name: room.name,
      area: room.area,
      bed: room.bed,
      facades: room.facades.filter(isFacade),
      orientationLabel: room.facades
        .map(
          (facade) =>
            ({
              N: "Север",
              NE: "Северо-восток",
              E: "Восток",
              SE: "Юго-восток",
              S: "Юг",
              SW: "Юго-запад",
              W: "Запад",
              NW: "Северо-запад",
            })[facade],
        )
        .join(" + "),
      floors: room.floors ?? [1, raw.floors],
      view: room.confirmedByHotel
        ? "Сторона подтверждена отелем; вид зависит от этажа"
        : "Размещение и вид не подтверждены отелем",
      photo: hotel.image,
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
    unknowns: raw.unknowns.map((item) => ({
      key: item.characteristic,
      question: item.question,
      why: item.why,
    })),
  };
}
