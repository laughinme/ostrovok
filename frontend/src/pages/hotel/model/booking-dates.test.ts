import { describe, expect, it } from "vitest";
import {
  addBookingDays,
  bookingMonth,
  bookingMonthDays,
  bookingNights,
  bookingNightLabel,
  selectBookingDate,
} from "./booking-dates";

describe("booking date range", () => {
  it("selects a period across months and restarts after a complete selection", () => {
    const start = selectBookingDate({ from: "2026-11-15", to: "2026-11-20" }, "2026-11-29");
    expect(start).toEqual({ from: "2026-11-29", to: "" });
    const range = selectBookingDate(start, "2026-12-03");
    expect(bookingNights(range)).toBe(4);
    expect(selectBookingDate(range, "2026-12-10")).toEqual({ from: "2026-12-10", to: "" });
  });
  it("keeps same-day and backwards clicks as a new arrival, without a zero-length stay", () => {
    expect(selectBookingDate({ from: "2026-11-15", to: "" }, "2026-11-15")).toEqual({
      from: "2026-11-15",
      to: "",
    });
    expect(selectBookingDate({ from: "2026-11-15", to: "" }, "2026-11-12")).toEqual({
      from: "2026-11-12",
      to: "",
    });
    expect(bookingNights({ from: "2026-11-15", to: "" })).toBe(0);
  });
  it("counts nights independently of daylight saving and handles leap years", () => {
    expect(bookingNights({ from: "2026-03-28", to: "2026-03-30" })).toBe(2);
    expect(addBookingDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(bookingMonth("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("lays out a Monday-first calendar without dropping a six-week month", () => {
    const days = bookingMonthDays("2026-11-01");
    expect(days.slice(0, 6)).toEqual(Array(6).fill(null));
    expect(days[6]).toBe("2026-11-01");
    expect(days.filter(Boolean)).toHaveLength(30);
    expect(bookingMonthDays("2028-02-01").filter(Boolean)).toHaveLength(29);
  });
  it("uses Russian night labels for totals", () => {
    expect([1, 2, 5, 11, 21].map(bookingNightLabel)).toEqual([
      "1 ночь",
      "2 ночи",
      "5 ночей",
      "11 ночей",
      "21 ночь",
    ]);
  });
});
