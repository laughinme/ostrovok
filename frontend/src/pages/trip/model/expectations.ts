import type { components } from "@/shared/api";

export type TripDetails = components["schemas"]["TripOut"];
export type ExpectationGroup = "quiet" | "views" | "route" | "nearby" | "weather" | "other";
export interface TripExpectation {
  id: string;
  characteristic: string;
  statement: string;
  scope: string;
  source?: string;
  checkedAt?: string;
  status?: "ok" | "stale" | "conflict";
  caveats: string[];
}
const directions: Record<string, string> = {
  N: "Север",
  NE: "Северо-восток",
  E: "Восток",
  SE: "Юго-восток",
  S: "Юг",
  SW: "Юго-запад",
  W: "Запад",
  NW: "Северо-запад",
};
const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const string = (value: unknown) => (typeof value === "string" ? value : "");

export function expectationScope(value: unknown, roomNames: Record<string, string> = {}) {
  const scope = object(value);
  const facades = Array.isArray(scope["facades"])
    ? scope["facades"].map((item) => directions[String(item)] ?? String(item)).join(", ")
    : "";
  const from = typeof scope["floorFrom"] === "number" ? scope["floorFrom"] : null;
  const to = typeof scope["floorTo"] === "number" ? scope["floorTo"] : null;
  const floors =
    from !== null && to !== null
      ? from === to
        ? `${from} этаж`
        : `этажи ${from}–${to}`
      : from !== null
        ? `от ${from} этажа`
        : to !== null
          ? `до ${to} этажа`
          : "";
  const dates =
    Array.isArray(scope["months"]) && scope["months"].length < 12
      ? scope["months"].map((month) => months[Number(month) - 1] ?? String(month)).join(", ")
      : "";
  const rooms = Array.isArray(scope["roomTypeIds"])
    ? scope["roomTypeIds"].map((id) => roomNames[String(id)] ?? String(id)).join(", ")
    : "";
  return (
    [facades, floors, dates, rooms ? `тип номера: ${rooms}` : ""].filter(Boolean).join(" · ") ||
    "Весь отель"
  );
}

export function expectationGroup(key: string): ExpectationGroup {
  if (/noise|quiet|remote_work|construction/.test(key)) return "quiet";
  if (/view|sunrise|sunset|sea_share/.test(key)) return "views";
  if (/beach|terrain|stroller|wheelchair|slope|accessib/.test(key)) return "route";
  if (/climate|weather|temperature/.test(key)) return "weather";
  if (/food|pharmacy|clinic|hospital|playground|parking|charging|infrastructure/.test(key))
    return "nearby";
  return "other";
}

export function promisedExpectations(
  promised: TripDetails["promised"],
  roomNames: Record<string, string> = {},
): TripExpectation[] {
  return promised.map((fact, index) => ({
    id: `${string(fact["factId"]) || "snapshot"}-${index}`,
    characteristic: string(fact["characteristic"]),
    statement: string(fact["statement"]) || "Описание факта пока не указано",
    scope: expectationScope(fact["scope"], roomNames),
    caveats: Array.isArray(fact["caveats"])
      ? fact["caveats"].filter((item): item is string => typeof item === "string")
      : [],
  }));
}

export function currentExpectations(facts: TripDetails["facts"]): TripExpectation[] {
  return facts.map((fact) => ({
    id: fact.id,
    characteristic: fact.characteristic,
    statement: fact.statement,
    scope: fact.scopeText || expectationScope(fact.scope),
    source: fact.sourceLabel,
    checkedAt: Number.isNaN(Date.parse(fact.observedAt))
      ? fact.observedAt
      : new Date(fact.observedAt).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }),
    status: fact.status,
    caveats: fact.caveats,
  }));
}
