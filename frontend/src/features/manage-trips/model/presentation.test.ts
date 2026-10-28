import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api";
import type { TripSummary } from "../api/trips";
import {
  feedbackError,
  feedbackPayload,
  newestTrips,
  promisedQuestions,
  sunsetTime,
  tripDate,
  tripGuests,
  tripNights,
} from "./presentation";

describe("trip presentation", () => {
  it("keeps calendar dates and counts nights across years and leap days", () => {
    expect(tripNights({ checkIn: "2026-12-30", checkOut: "2027-01-02" })).toBe(3);
    expect(tripNights({ checkIn: "2028-02-28", checkOut: "2028-03-01" })).toBe(2);
    expect(tripDate("2027-01-01")).toBe("1 января");
    expect(tripGuests({ adults: 2, children: 1 })).toBe("Взрослых: 2 · детей: 1");
  });

  it("shows astronomical sunset in Sochi time regardless of the browser timezone", () => {
    expect(sunsetTime("2026-11-10T13:58:00Z")).toBe("16:58");
    expect(sunsetTime("2026-11-10T16:58:00+03:00")).toBe("16:58");
  });

  it("sorts requests newest first without changing cached data", () => {
    const summaries = [
      { createdAt: "2026-10-01T00:00:00Z" },
      { createdAt: "2026-10-02T00:00:00Z" },
    ] as TripSummary[];
    expect(newestTrips(summaries)).toEqual([summaries[1], summaries[0]]);
    expect(summaries[0]?.createdAt).toBe("2026-10-01T00:00:00Z");
  });

  it("uses the promised snapshot, removes invalid and duplicate facts, and preserves no answers", () => {
    const promised = [
      { factId: "sea", statement: "Море из окна", characteristic: "sea_view", value: true },
      { factId: "quiet", statement: "Ночью шумно", characteristic: "night_noise", value: false },
      { factId: "sea", statement: "Дубликат" },
      { statement: "Без идентификатора" },
      { factId: "invalid", statement: 123 },
    ];
    expect(promisedQuestions(promised).map((item) => item.question)).toEqual([
      "Видно ли было море?",
      "Совпало ли ожидание?",
    ]);
    expect(feedbackPayload(promised, { sea: false, quiet: true, other: true })).toEqual({
      answers: [
        { factId: "sea", answer: false },
        { factId: "quiet", answer: true },
      ],
    });
    expect(feedbackPayload(promised, {})).toEqual({ answers: [] });
  });

  it("explains feedback errors", () => {
    expect(feedbackError(new ApiError(400, "Bad request"))).toBe(
      "Отзыв можно оставить после выезда",
    );
    expect(feedbackError(new ApiError(409, "Conflict"))).toBe("Уже ответили");
    expect(feedbackError(new ApiError(503, "Попробуйте позже"))).toBe("Попробуйте позже");
  });

  it("keeps separate scopes and negative promises when building questions", () => {
    const facts = [
      {
        factId: "first",
        statement: "Моря не видно",
        characteristic: "sea_view",
        value: false,
        scope: { facades: ["N", "E"], floorFrom: 1, floorTo: 3 },
      },
      {
        factId: "second",
        statement: "Море видно",
        characteristic: "sea_view",
        value: true,
        scope: { facades: ["SW"], floorFrom: 4, floorTo: 4 },
      },
    ];
    const questions = promisedQuestions(facts);
    expect(questions.map((item) => item.scopeText)).toEqual([
      "С, В-сторона · этажи 1–3",
      "ЮЗ-сторона · этаж 4",
    ]);
    expect(questions[0]?.question).toBe("Совпало ли ожидание?");
    expect(feedbackPayload(facts, { first: false })).toEqual({
      answers: [{ factId: "first", answer: false }],
    });
  });
});
