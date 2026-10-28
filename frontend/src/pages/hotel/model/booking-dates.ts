export type BookingDates = { from: string; to: string };

export const bookingToday = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow" }).format(new Date());

export function addBookingDays(value: string, days: number) {
  return new Date(Date.parse(value) + days * 86400000).toISOString().slice(0, 10);
}

export function bookingMonth(value: string, offset = 0) {
  const date = new Date(`${value}T12:00:00Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1))
    .toISOString()
    .slice(0, 10);
}

export function bookingMonthDays(month: string) {
  const start = new Date(`${month}T12:00:00Z`);
  const offset = (start.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = addBookingDays(month, index - offset);
    return date.slice(0, 7) === month.slice(0, 7) ? date : null;
  });
}

export function selectBookingDate(range: BookingDates, date: string): BookingDates {
  return !range.from || range.to || date <= range.from
    ? { from: date, to: "" }
    : { from: range.from, to: date };
}

export function bookingNights(range: BookingDates) {
  if (!range.from || !range.to) return 0;
  return Math.max(0, Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86400000));
}

export function bookingNightLabel(nights: number) {
  const last = nights % 10;
  return `${nights} ${nights % 100 >= 11 && nights % 100 <= 14 ? "ночей" : last === 1 ? "ночь" : last >= 2 && last <= 4 ? "ночи" : "ночей"}`;
}

export function bookingDateLabel(value: string, full = false) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: full ? "long" : "short",
    ...(full ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}
