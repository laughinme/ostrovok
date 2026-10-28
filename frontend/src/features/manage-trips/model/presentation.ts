import { ApiError } from "@/shared/api";
import type { Booking, Feedback, Trip, TripSummary } from "../api/trips";

export const bookingStatus: Record<Booking["status"], string> = {
  requested: "Ждём подтверждения",
  confirmed: "Отель подтвердил",
  alternative_offered: "Отель предложил другой вариант",
  declined: "Отель отклонил заявку",
  completed: "Поездка завершена",
};

export function tripDate(value: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
    ...options,
  }).format(new Date(value));
}

export function sunsetTime(at: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(at));
}

export function tripNights(booking: Pick<Booking, "checkIn" | "checkOut">) {
  return Math.max(
    0,
    Math.round((Date.parse(booking.checkOut) - Date.parse(booking.checkIn)) / 86400000),
  );
}

export function tripGuests({ adults, children = 0 }: Booking["guests"]) {
  return `Взрослых: ${adults}${children ? ` · детей: ${children}` : ""}`;
}

export function newestTrips(trips: TripSummary[]) {
  return [...trips].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function promisedScope(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Область не указана";
  const scope = value as Record<string, unknown>;
  const facades: Record<string, string> = {
    N: "С",
    NE: "СВ",
    E: "В",
    SE: "ЮВ",
    S: "Ю",
    SW: "ЮЗ",
    W: "З",
    NW: "СЗ",
  };
  const sides = Array.isArray(scope["facades"])
    ? scope["facades"]
        .flatMap((side: unknown) =>
          typeof side === "string" && facades[side] ? [facades[side]] : [],
        )
        .join(", ")
    : "";
  const from = typeof scope["floorFrom"] === "number" ? scope["floorFrom"] : null;
  const to = typeof scope["floorTo"] === "number" ? scope["floorTo"] : null;
  const floor =
    from != null && to != null
      ? from === to
        ? `этаж ${from}`
        : `этажи ${from}–${to}`
      : from != null
        ? `этаж ≥ ${from}`
        : to != null
          ? `этаж ≤ ${to}`
          : "";
  return [sides ? `${sides}-сторона` : "", floor].filter(Boolean).join(" · ") || "Весь отель";
}

export function promisedQuestions(promised: Trip["promised"]) {
  const seen = new Set<string>();
  return promised.flatMap((fact) => {
    const id = fact["factId"];
    const statement = fact["statement"];
    if (
      typeof id !== "string" ||
      !id ||
      typeof statement !== "string" ||
      !statement ||
      seen.has(id)
    )
      return [];
    seen.add(id);
    const question =
      fact["characteristic"] === "sea_view" && fact["value"] === true
        ? "Видно ли было море?"
        : fact["characteristic"] === "sunset_over_sea" && fact["value"] === true
          ? "Был ли виден закат над морем?"
          : "Совпало ли ожидание?";
    return [{ id, statement, question, scopeText: promisedScope(fact["scope"]) }];
  });
}

export function feedbackPayload(
  promised: Trip["promised"],
  answers: Record<string, boolean>,
): Feedback {
  return {
    answers: promisedQuestions(promised).flatMap(({ id }) =>
      typeof answers[id] === "boolean" ? [{ factId: id, answer: answers[id] }] : [],
    ),
  };
}

export function feedbackError(error: Error) {
  if (error instanceof ApiError && error.status === 400) return "Отзыв можно оставить после выезда";
  if (error instanceof ApiError && error.status === 409) return "Уже ответили";
  return error.message;
}
