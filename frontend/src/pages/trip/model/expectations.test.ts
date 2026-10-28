import { describe, expect, it } from "vitest";
import {
  currentExpectations,
  expectationGroup,
  expectationScope,
  mergedExpectations,
  promisedExpectations,
} from "./expectations";
import { demoExpectations } from "./demo-expectations";
import { demoTrips } from "./trip";
import { bookingTripRecord } from "./booking-trips";

describe("booking expectations", () => {
  it("merges the booking snapshot with current evidence without repeating facts", () => {
    const data = demoExpectations(demoTrips[0]!);
    const original = structuredClone(data);
    const result = mergedExpectations(data);
    expect(result).toHaveLength(22);
    expect(result.every((row) => row.booked && row.latest && !row.changed)).toBe(true);
    expect(result[0]?.source).toBe("Демонстрационный сценарий");
    expect(result[0]?.checkedAt).toBe("28.10.2026");
    expect(data).toEqual(original);
  });
  it("keeps the old statement alongside changed or conflicting current evidence", () => {
    const data = demoExpectations(demoTrips[0]!);
    const bookedStatement = data.promised[0]!["statement"];
    data.facts[0] = {
      ...data.facts[0]!,
      statement: "Самолёты слышны ночью",
      status: "conflict",
      caveats: ["Нужно уточнить у отеля"],
    };
    const result = mergedExpectations(data);
    expect(result).toHaveLength(22);
    expect(result[0]).toMatchObject({
      changed: true,
      statement: "Самолёты слышны ночью",
      status: "conflict",
      booked: { statement: bookedStatement },
      caveats: ["Нужно уточнить у отеля"],
    });
    expect(data.promised[0]!["statement"]).toBe(bookedStatement);
  });
  it("retains saved facts that disappeared and adds current-only facts once", () => {
    const data = demoExpectations(demoTrips[0]!);
    const removed = data.facts.shift()!;
    const added = {
      ...removed,
      id: "new-fact",
      characteristic: "pets_policy",
      statement: "Можно с собакой",
    };
    data.facts.push(added);
    const result = mergedExpectations(data);
    expect(result).toHaveLength(23);
    expect(result[0]).toMatchObject({ latest: null, booked: { statement: removed.statement } });
    expect(result.at(-1)).toMatchObject({ booked: null, statement: added.statement });
    expect(mergedExpectations({ promised: [], facts: data.facts })).toHaveLength(22);
    expect(mergedExpectations({ promised: [], facts: [] })).toEqual([]);
  });
  it("matches replacement fact IDs by scope while preserving different floors and seasons", () => {
    const data = demoExpectations(demoTrips[0]!);
    const fact = data.facts[0]!;
    data.promised = [
      {
        factId: "older-version",
        characteristic: fact.characteristic,
        statement: fact.statement,
        scope: { months: [11, 12], floorFrom: 5, facades: ["SW", "S"] },
      },
    ];
    data.facts = [
      { ...fact, scope: { facades: ["S", "SW"], floorFrom: 5, months: [12, 11] } },
      { ...fact, id: "floor-six", scope: { facades: ["SW"], floorFrom: 6, months: [11] } },
      { ...fact, id: "summer", scope: { facades: ["SW"], floorFrom: 5, months: [7] } },
    ];
    const result = mergedExpectations(data);
    expect(result).toHaveLength(3);
    expect(result[0]?.latest?.id).toBe(fact.id);
    expect(result[1]?.booked).toBeNull();
    expect(result[2]?.booked).toBeNull();
  });
  it("keeps booking scope when the source fact covers the entire hotel", () => {
    const data = demoExpectations(demoTrips[0]!);
    data.facts[0] = { ...data.facts[0]!, scope: {}, scopeText: "Весь отель" };
    const result = mergedExpectations(data);
    expect(result).toHaveLength(22);
    expect(result[0]).toMatchObject({
      scope: "Юго-запад · 5 этаж · ноя",
      latest: { scope: "Весь отель" },
      changed: false,
    });
  });
  it("keeps separate statements for separate floors without altering the snapshot", () => {
    const snapshot = [1, 2, 3].map((floor) => ({
      factId: `sun-${floor}`,
      characteristic: "sunrise",
      statement: floor === 3 ? "Рассвет виден" : "Рассвета не видно",
      scope: { facades: ["SE"], floorFrom: floor, floorTo: floor },
    }));
    const original = structuredClone(snapshot);
    const result = promisedExpectations(snapshot);
    expect(result).toHaveLength(3);
    expect(result.map((item) => item.scope)).toEqual([
      "Юго-восток · 1 этаж",
      "Юго-восток · 2 этаж",
      "Юго-восток · 3 этаж",
    ]);
    expect(new Set(result.map((item) => item.id)).size).toBe(3);
    expect(snapshot).toEqual(original);
  });
  it("retains ranges, all eight facades, months and room restrictions", () => {
    expect(
      expectationScope({
        facades: ["N", "E", "S", "W"],
        floorFrom: 1,
        floorTo: 3,
        months: [11, 12],
        roomTypeIds: ["family"],
      }),
    ).toBe("Север, Восток, Юг, Запад · этажи 1–3 · ноя, дек · тип номера: family");
    expect(expectationScope({ floorFrom: 4 })).toBe("от 4 этажа");
    expect(expectationScope({ floorTo: 2 })).toBe("до 2 этажа");
    expect(expectationScope({})).toBe("Весь отель");
    expect(expectationScope({ roomTypeIds: ["family"] }, { family: "Семейный номер" })).toBe(
      "тип номера: Семейный номер",
    );
  });
  it("keeps unfamiliar keys and malformed optional descriptions readable", () => {
    expect(expectationGroup("new_characteristic")).toBe("other");
    expect(
      promisedExpectations([{ characteristic: "new_characteristic", scope: null }])[0]?.statement,
    ).toBe("Описание факта пока не указано");
    expect(expectationGroup("aircraft_noise")).toBe("quiet");
    expect(expectationGroup("stroller_access")).toBe("route");
    expect(expectationGroup("food_late")).toBe("nearby");
  });
  it("keeps current evidence, stale status and caveats distinct from booked promises", () => {
    const data = demoExpectations(demoTrips[0]!);
    const snapshot = structuredClone(data.promised);
    data.facts[0] = {
      ...data.facts[0]!,
      statement: "Сведения изменились",
      sourceLabel: "Отель",
      status: "stale",
      scopeText: "Северная сторона · этаж 2",
      caveats: ["Требует проверки"],
    };
    const current = currentExpectations(data.facts)[0]!;
    expect(current).toMatchObject({
      statement: "Сведения изменились",
      scope: "Северная сторона · этаж 2",
      source: "Отель",
      status: "stale",
      caveats: ["Требует проверки"],
    });
    expect(current.checkedAt).toBe("28.10.2026");
    expect(data.promised).toEqual(snapshot);
    expect(promisedExpectations(data.promised)).toHaveLength(22);
  });
  it("does not infer a confirmed room or facade from a booking request", () => {
    const result = bookingTripRecord({
      hotelName: "Отель",
      hotelArea: "Сочи",
      createdAt: "2026-10-28",
      booking: {
        id: "booking",
        hotelId: "hotel",
        roomTypeId: "family",
        ratePlanId: "rate",
        checkIn: "2026-11-10",
        checkOut: "2026-11-15",
        guests: { adults: 2, children: 1 },
        status: "alternative_offered",
        request: "ЮВ, этаж 3",
        hotelReply: "Предлагаем другой вариант",
        priceDemo: 3000,
      },
    });
    expect(result).toMatchObject({
      bookingId: "booking",
      status: "alternative_offered",
      floor: null,
      room: null,
      hotel: { bestFacade: null },
    });
  });
});
