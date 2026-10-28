import type { TripRecord } from "./trip";
import type { TripDetails } from "./expectations";

export function demoExpectations(
  trip: TripRecord,
): Pick<TripDetails, "promised" | "facts" | "caveats"> {
  const floor = trip.floor ?? 4;
  const scope = {
    facades: [trip.hotel.bestFacade ?? "SW"],
    floorFrom: floor,
    floorTo: floor,
    months: [Number(trip.checkIn.slice(5, 7))],
  };
  const statements =
    trip.id === "OKN-1015"
      ? [
          ["aircraft_noise", "Самолётов почти не слышно"],
          ["beach_walk", "До пляжа 6 минут пешком. Обратно — около 9 минут, в гору"],
          ["climate", "Воздух до 17°, вода 17° · солнце 7,5 ч в день"],
          ["construction", "Рядом идёт стройка"],
          ["day_noise", "Днём тихо"],
          ["ev_charging", "Зарядки для электромобиля рядом нет"],
          ["food_late", "Рядом есть где поесть поздно вечером"],
          ["hospital_walk", "Детская больница или клиника в 3 км"],
          ["mountain_view", "Гор из окон не видно"],
          ["mountain_view", "На верхнем этаже виден горный хребет"],
          ["night_noise", "Ночью тихо"],
          ["parking", "Парковки рядом нет"],
          ["pharmacy_walk", "Круглосуточная аптека в 15 минутах пешком"],
          ["playground_walk", "Детская площадка в 10 минутах пешком"],
          ["remote_work", "Тихо днём — можно спокойно поработать"],
          ["sea_view", "Море видно из окна"],
          ["terrain", "Обратно от пляжа есть подъём"],
          ["stroller_access", "На дороге к пляжу есть лестница"],
          ["sunrise", "Рассвета из окна не видно"],
          ["sunrise", "На верхнем этаже рассвет виден сбоку"],
          ["sunset_over_sea", "Закат над морем виден из окна"],
          ["beach_access", "Доступность альтернативного пути без ступеней не подтверждена"],
        ]
      : [
          [
            "sea_view",
            trip.destination === "Красная Поляна"
              ? "Номер с видом на горы запрошен, но ещё не подтверждён"
              : "С балкона видно море",
          ],
          ["night_noise", "Окна выходят на тихую сторону"],
          [
            "beach_walk",
            trip.destination === "Красная Поляна"
              ? "Отель находится в горах, до моря нужна поездка"
              : "До пляжа около минуты пешком",
          ],
          ["food_late", "На территории есть ресторан"],
        ];
  const promised = statements.map(([characteristic, statement], index) => ({
    factId: `${trip.id}-fact-${index}`,
    characteristic,
    statement,
    scope: index === 9 || index === 19 ? { ...scope, floorFrom: 6, floorTo: 6 } : scope,
    confidence: 0.8,
    value: null,
  }));
  return {
    promised,
    facts: promised.map((fact) => ({
      id: fact.factId,
      hotelId: trip.hotelId ?? trip.id,
      characteristic: fact.characteristic!,
      statement: fact.statement!,
      scope: fact.scope,
      scopeText: "",
      value: null,
      confidence: 0.8,
      confidenceLabel: "скорее да",
      source: "demo_card",
      sourceLabel: "Демонстрационный сценарий",
      method: "Демо",
      observedAt: "2026-10-28T10:00:00Z",
      status: "ok",
      evidence: [],
      caveats: [],
      isDemo: true,
    })),
    caveats: [
      "Время заката — астрономический расчёт. Видимость из окна зависит от стороны здания и препятствий.",
      "Температура и солнечные часы — климатические нормы, а не прогноз погоды на даты поездки.",
      "Для воздуха использованы данные 2016–2025 годов; для воды — полные месяцы 2023–2025 годов.",
      "Солнце и световой день указаны в часах в день, температура — в °C.",
      "Доступность неизученных участков маршрута не подтверждена.",
    ],
  };
}
