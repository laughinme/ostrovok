import {
  CRITERIA,
  criterionKeys,
  hotels,
  type ApiHotel,
  type ApiIntent,
  type ApiMatch,
  type Criterion,
} from "@/entities/hotel";
import { parseQuery } from "@/features/hotel-search";
import { ApiError, type components } from "@/shared/api";
import { demoHotels } from "./fixtures";

type SearchRequest = components["schemas"]["SearchRequest"];
type SearchResult = components["schemas"]["SearchResultOut"];

export function demoIntent(text: string): ApiIntent {
  const dates = text.match(/20\d{2}-\d{2}-\d{2}/g);
  const budget = text.match(/до\s*(\d+(?:[\s,.]\d+)?)\s*(тыс|₽|руб)/i);
  const amount = budget
    ? Number(budget[1]!.replace(/\s/g, "").replace(",", ".")) * (/тыс/i.test(budget[2]!) ? 1000 : 1)
    : undefined;
  return {
    text,
    chips: parseQuery(text).map((criterion) => ({
      id: `demo-chip-${criterion}`,
      characteristic: criterionKeys[criterion],
      label: CRITERIA[criterion].label,
      importance: "important",
      checkable: ["pets", "work"].includes(criterion) ? "ask_hotelier" : "compute",
      fromProfile: false,
    })),
    trip: {
      from: dates?.[0] ?? "2026-11-10",
      to: dates?.[1] ?? "2026-11-15",
      adults: 2,
      children: /реб[её]н|дет/i.test(text) ? 1 : 0,
      ...(amount ? { budgetPerNight: amount } : {}),
    },
    planner: "rules",
    hints: ["Демо-ответ для проверки дизайна. Запросы к LLM не отправляются."],
  };
}

export function demoMatch(hotel: ApiHotel, intent: ApiIntent): ApiMatch {
  const source = hotels.find((item) => hotel.id === `demo-${item.id}`)!;
  const perChip = intent.chips.map((chip) => {
    const criterion = (Object.keys(criterionKeys) as Criterion[]).find(
      (key) => criterionKeys[key] === chip.characteristic,
    );
    const fact = hotel.facts.find((item) => item.characteristic === chip.characteristic);
    const p = criterion && fact?.status === "ok" ? source.scores[criterion] / 100 : null;
    return {
      chipId: chip.id,
      verdict:
        p === null
          ? ("unknown" as const)
          : p >= 0.8
            ? ("yes" as const)
            : p >= 0.5
              ? ("partial" as const)
              : ("no" as const),
      probability: p,
      factId: fact?.id ?? null,
      line:
        p === null
          ? "Нужно уточнение: демонстрационное состояние"
          : `${chip.label}: ${Math.round(p * 100)}% совпадения в демо-сценарии`,
    };
  });
  const score =
    perChip.reduce((sum, chip) => sum + (chip.probability ?? 0.35), 0) /
    Math.max(1, perChip.length);
  return {
    hotelId: hotel.id,
    name: hotel.name,
    area: hotel.area,
    location: hotel.location,
    score,
    disappointmentRisk: 1 - score,
    perChip,
    thumbnail: { kind: "facades", params: {} },
    priceFromDemo: hotel.priceFromDemo ?? null,
    tradeoff: perChip.some((chip) => chip.verdict === "no")
      ? "Есть компромиссы по части пожеланий - сравните варианты"
      : "Демонстрационный подбор для проверки интерфейса",
    recommendation: {
      roomTypeId: hotel.rooms[0]!.id,
      roomName: hotel.rooms[0]!.name,
      scope: { facades: ["SW"], floorFrom: 4, floorTo: hotel.floors },
      scopeText: "Юго-западная сторона, от 4 этажа",
      request: "Тихий номер на юго-западной стороне, по возможности от 4 этажа",
      confirmedByHotel: true,
      priceDemo: hotel.priceFromDemo ?? null,
    },
  };
}

function makeSearchId(intent: ApiIntent) {
  const json = JSON.stringify({ chips: intent.chips, trip: intent.trip });
  return (
    "demo-search-" +
    btoa(String.fromCharCode(...new TextEncoder().encode(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  );
}

export function demoSearch(request: SearchRequest, catalog = demoHotels): SearchResult {
  const parsed = demoIntent(request.text ?? "");
  const intent: ApiIntent = {
    ...parsed,
    chips: request.chips ?? parsed.chips,
    trip: { ...parsed.trip, ...request.trip },
  };
  return {
    searchId: makeSearchId(intent),
    intent,
    matches: catalog
      .filter(
        (hotel) =>
          !intent.trip.budgetPerNight || (hotel.priceFromDemo ?? 0) <= intent.trip.budgetPerNight,
      )
      .map((hotel) => demoMatch(hotel, intent))
      .sort((a, b) => b.score - a.score),
    relaxations: [],
    research: [],
  };
}

export function restoreDemoSearch(id: string, catalog: ApiHotel[]) {
  if (!id.startsWith("demo-search-"))
    throw new ApiError(404, "Этот поиск не относится к демо-режиму");
  try {
    const bytes = Uint8Array.from(
      atob(id.slice(12).replace(/-/g, "+").replace(/_/g, "/")),
      (char) => char.charCodeAt(0),
    );
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as SearchRequest;
    if (!Array.isArray(parsed.chips) || !parsed.trip || typeof parsed.trip !== "object")
      throw new Error("invalid search");
    return demoSearch({ chips: parsed.chips, trip: parsed.trip, useProfile: false }, catalog);
  } catch {
    throw new ApiError(404, "Демо-поиск не найден. Выполните подбор заново.");
  }
}
