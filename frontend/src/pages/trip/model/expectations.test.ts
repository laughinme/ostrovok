import { describe, expect, it } from "vitest";
import {
  currentExpectations,
  expectationGroup,
  expectationScope,
  promisedExpectations,
} from "./expectations";
import { demoExpectations } from "./demo-expectations";
import { demoTrips } from "./trip";
import { bookingTripRecord } from "./booking-trips";

describe("booking expectations", () => {
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
