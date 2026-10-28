import { ApiError, type ApiOptions, type components } from "@/shared/api";
import { DEMO_DATE, demoHotels, demoQuestions } from "./fixtures";
import { demoIntent, demoMatch, demoSearch, restoreDemoSearch } from "./search";
import { demoBeachRoute, demoDirectionRoute, demoNoise } from "./geo";
import { demoSimilar } from "./similar";

type State = {
  facts: Record<string, components["schemas"]["FactOut"]>;
  answered: string[];
  runs?: Record<string, components["schemas"]["AgentRunOut"]>;
  bookings?: Record<string, { booking: components["schemas"]["BookingOut"]; createdAt: string }>;
  taste?: components["schemas"]["TasteProfileOut"];
  mappings?: Record<string, components["schemas"]["FacadeMappingIn"][]>;
};
let memory: State = { facts: {}, answered: [] };
const STORAGE = "okno.design-demo.state";

function state(): State {
  if (typeof window === "undefined") return { facts: {}, answered: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as State | null;
    if (saved?.facts && Array.isArray(saved.answered)) return saved;
  } catch {
    return memory;
  }
  return memory;
}
function save(next: State) {
  memory = next;
  try {
    localStorage.setItem(STORAGE, JSON.stringify(next));
  } catch {
    return;
  }
}
function catalog() {
  const saved = state();
  return structuredClone(demoHotels).map((hotel) => ({
    ...hotel,
    facts: hotel.facts.map((fact) => saved.facts[fact.id] ?? fact),
    rooms: hotel.rooms.map((room) => {
      const mapped = saved.mappings?.[hotel.id]?.filter(
        (mapping) => mapping.roomTypeId === room.id,
      );
      return mapped?.length
        ? {
            ...room,
            facades: [...new Set(mapped.map((mapping) => mapping.facade))],
            floors: [
              Math.min(...mapped.map((mapping) => mapping.floorFrom)),
              Math.max(...mapped.map((mapping) => mapping.floorTo)),
            ] as [number, number],
            confirmedByHotel: true,
          }
        : room;
    }),
  }));
}
function required<T>(value: T | undefined): T {
  if (!value) throw new ApiError(404, "В этом демо-сценарии объект не найден");
  return value;
}

export function demoResponse(path: string, options: ApiOptions = {}): unknown {
  const method = options.method ?? "GET";
  const data = (options.body ?? {}) as Record<string, unknown>;
  const hotels = catalog();
  const [pathname, query] = path.split("?");
  const params = new URLSearchParams(query);
  const pieces = pathname!.split("/").filter(Boolean).map(decodeURIComponent);
  if (path === "/intents" && method === "POST") return demoIntent(String(data["text"] ?? ""));
  if (path === "/searches" && method === "POST")
    return demoSearch(data as components["schemas"]["SearchRequest"], hotels);
  if (pieces[0] === "searches" && pieces.length === 2 && method === "GET")
    return restoreDemoSearch(pieces[1]!, hotels);
  if (pieces[0] === "searches" && pieces[2] === "wishes" && method === "POST") {
    const previous = restoreDemoSearch(pieces[1]!, hotels);
    const addition = demoIntent(String(data["text"] ?? ""));
    const chips = [
      ...previous.intent.chips,
      ...addition.chips.filter(
        (chip) =>
          !previous.intent.chips.some((item) => item.characteristic === chip.characteristic),
      ),
    ];
    return {
      runId: null,
      search: demoSearch(
        { text: String(data["text"] ?? ""), chips, trip: previous.intent.trip, useProfile: false },
        hotels,
      ),
    } satisfies components["schemas"]["WishStarted"];
  }
  if (pieces[0] === "searches" && pieces[2] === "research" && method === "POST") {
    const search = restoreDemoSearch(pieces[1]!, hotels);
    const characteristic = String(
      data["characteristic"] ??
        required(search.intent.chips.find((chip) => chip.id === data["chipId"])).characteristic,
    );
    const requestedIds = data["hotelIds"] as string[] | undefined;
    const selected = requestedIds?.length
      ? requestedIds.map((id) => required(hotels.find((hotel) => hotel.id === id)))
      : hotels;
    const runId = `demo-run-${crypto.randomUUID()}`;
    const at = new Date().toISOString();
    const saved = state();
    saved.runs = {
      ...saved.runs,
      [runId]: {
        id: runId,
        agent: "liaison",
        goal: `Уточнить ${characteristic}: ${selected.map((hotel) => hotel.name).join(", ")}`,
        planner: "rules",
        status: "done",
        createdAt: at,
        startedAt: at,
        finishedAt: at,
        steps: [
          {
            seq: 1,
            at,
            kind: "reason",
            summary: "Проверили сведения и выбрали вопрос по вашему пожеланию.",
          },
          {
            seq: 2,
            at,
            kind: "tool",
            tool: "demo_hotel_question",
            summary:
              "Имитировали передачу вопроса демо-отельеру. Реальное сообщение не отправлялось.",
          },
          {
            seq: 3,
            at,
            kind: "result",
            summary:
              "Демо-вопрос записан. В реальном сценарии здесь появится ответ отеля; текущие факты пока не меняются.",
          },
        ],
        subject: { hotelIds: selected.map((hotel) => hotel.id), characteristic, isDemo: true },
      },
    };
    save(saved);
    return { runId } satisfies components["schemas"]["RunStarted"];
  }
  if (pieces[0] === "runs" && pieces.length === 2 && method === "GET")
    return required(state().runs?.[pieces[1]!]);
  if (path === "/hotels" && method === "GET") return hotels;
  if (pieces[0] === "hotels" && pieces.length === 2 && method === "GET")
    return required(hotels.find((hotel) => hotel.id === pieces[1]));
  if (pieces[0] === "hotels" && pieces[2] === "similar" && pieces.length === 3 && method === "POST")
    return demoSimilar(
      required(hotels.find((hotel) => hotel.id === pieces[1])),
      hotels,
      data as components["schemas"]["SimilarIn"],
    );
  if (pieces[0] === "hotels" && method === "GET" && pieces.length > 2) {
    const hotel = required(hotels.find((item) => item.id === pieces[1]));
    if (pieces[2] === "places" && pieces.length === 3) {
      const text = (params.get("q") ?? "").toLocaleLowerCase("ru");
      return hotel.nearby
        .filter((place) => `${place.title} ${place.name}`.toLocaleLowerCase("ru").includes(text))
        .map((place) => ({
          ref: place.osmRef ?? `${place.kind}:${place.name}`,
          name: place.name || place.title,
          address: [place.title, place.distanceText].filter(Boolean).join(" · "),
          location: place.location,
          attribution: "Демо-данные",
        }));
    }
    if (pieces[2] === "route" && pieces.length === 3)
      return demoDirectionRoute(
        hotel,
        [Number(params.get("lon")), Number(params.get("lat"))],
        params.get("name") ?? "Место рядом",
        params.get("profile") ?? "walk",
      );
    if (pieces[2] === "routes" && ["station", "center"].includes(pieces[3] ?? "")) {
      const place = hotel.nearby.find(
        (item) => item.kind === (pieces[3] === "station" ? "station" : "center"),
      );
      if (!place)
        return demoDirectionRoute(
          hotel,
          [hotel.location[0] + 0.006, hotel.location[1] + 0.004],
          pieces[3] === "station" ? "Станция · демо" : "Центр · демо",
          params.get("profile") ?? "walk",
        );
      return demoDirectionRoute(hotel, place.location, place.name, params.get("profile") ?? "walk");
    }
    if (pieces[2] === "noise" && pieces.length === 3) return demoNoise(hotel);
    if (pieces[2] === "routes" && pieces[3] === "beach" && pieces.length === 4)
      return demoBeachRoute(hotel, params.get("profile") ?? "walk");
  }
  if (path === "/compare" && method === "POST") {
    const request = data as components["schemas"]["CompareIn"];
    const intent = {
      ...demoIntent("тихо, море и закат"),
      ...(request.chips ? { chips: request.chips } : {}),
      ...(request.trip ? { trip: request.trip } : {}),
    };
    const matches = request.selections.map((selection) =>
      demoMatch(required(hotels.find((hotel) => hotel.id === selection.hotelId)), intent),
    );
    return {
      intent,
      matches,
      rows: intent.chips.map((chip) => ({
        chipId: chip.id,
        label: chip.label,
        results: matches.flatMap((match) =>
          match.perChip.filter((result) => result.chipId === chip.id),
        ),
      })),
      summary: "Сравнение демонстрационных вариантов. Запросы к LLM не выполнялись.",
    } satisfies components["schemas"]["CompareOut"];
  }
  if (path === "/auth/demo" && method === "POST")
    return {
      access_token: "local-design-demo",
      token_type: "bearer",
      expires_in: 3600,
    } satisfies components["schemas"]["TokenPair"];
  if (pathname === "/me/taste") {
    const saved = state();
    const profile = saved.taste ?? { enabled: false, summary: [], weights: [] };
    if (method === "DELETE") {
      saved.taste = { enabled: false, summary: [], weights: [] };
      save(saved);
      return;
    }
    if (method === "PATCH") {
      const patch = data as components["schemas"]["TastePatch"];
      saved.taste = {
        ...profile,
        enabled: patch.enabled ?? profile.enabled,
        weights: patch.weights
          ? [
              ...profile.weights.filter(
                (weight) =>
                  !patch.weights!.some((item) => item.characteristic === weight.characteristic),
              ),
              ...patch.weights.map((weight) => ({ ...weight, because: "Задано в локальном демо" })),
            ]
          : profile.weights,
      };
      save(saved);
      return saved.taste;
    }
    return profile;
  }
  if (pathname === "/me/trips" && method === "GET")
    return Object.values(state().bookings ?? {}).map(({ booking, createdAt }) => {
      const hotel = required(hotels.find((item) => item.id === booking.hotelId));
      return {
        booking,
        createdAt,
        hotelName: hotel.name,
        hotelArea: hotel.area,
      } satisfies components["schemas"]["TripSummaryOut"];
    });
  if (pieces[0] === "trips") {
    const saved = state();
    const item = required(saved.bookings?.[pieces[1]!]);
    const hotel = required(hotels.find((hotel) => hotel.id === item.booking.hotelId));
    if (pieces[2] === "feedback" && method === "POST") return;
    if (pieces.length === 2 && method === "GET")
      return {
        booking: item.booking,
        promised: [],
        facts: hotel.facts,
        climate: null,
        sunsets: [],
        beachRoute: demoBeachRoute(hotel),
        caveats: ["Локальный демо-сценарий. Заявка и ответы не отправляются в отель."],
      } satisfies components["schemas"]["TripOut"];
  }
  if (pieces[0] === "facts" && pieces.length === 2 && method === "GET") {
    const fact = required(
      hotels.flatMap((hotel) => hotel.facts).find((item) => item.id === pieces[1]),
    );
    return {
      ...fact,
      sources: [
        {
          kind: "demo_card",
          label: "Локальный сценарий для дизайна",
          observedAt: DEMO_DATE,
          confidence: fact.confidence,
        },
      ],
      history: [
        {
          at: DEMO_DATE,
          statement: fact.statement,
          confidence: fact.confidence,
          reason: "Синтетические данные. LLM и сервер не вызывались.",
        },
      ],
    } satisfies components["schemas"]["FactDetailOut"];
  }
  if (path === "/bookings" && method === "POST") {
    const request = data as components["schemas"]["BookingIn"];
    const hotel = required(hotels.find((item) => item.id === request.hotelId));
    const room = required(hotel.rooms.find((item) => item.id === request.roomTypeId));
    const rate = required(room.rates.find((item) => item.id === request.ratePlanId));
    const booking = {
      ...request,
      id: "demo-booking-" + Date.now().toString(36),
      request: request.request ?? "",
      status: "requested",
      hotelReply: "Демонстрационная заявка. Она не отправляется в отель.",
      priceDemo: rate.priceDemo,
    } satisfies components["schemas"]["BookingOut"];
    const saved = state();
    saved.bookings = {
      ...saved.bookings,
      [booking.id]: { booking, createdAt: new Date().toISOString() },
    };
    save(saved);
    return booking;
  }
  if (pieces[0] === "partner" && pieces[1] === "hotels" && method === "GET") {
    const hotel = required(hotels.find((item) => item.id === pieces[2]));
    if (pieces[3] === "questions")
      return demoQuestions.map((question) => ({
        ...question,
        status: state().answered.includes(question.id) ? "answered" : "open",
      }));
    if (pieces[3] === "requests")
      return Object.values(state().bookings ?? {})
        .map((item) => item.booking)
        .filter((booking) => booking.hotelId === hotel.id);
    if (pieces[3] === "demand")
      return {
        hotelId: hotel.id,
        district: hotel.area,
        days: 7,
        items: [],
      } satisfies components["schemas"]["DemandOut"];
    if (pieces[3] === "notifications") return [];
    if (pieces.length === 3)
      return {
        hotelId: hotel.id,
        name: hotel.name,
        facts: hotel.facts,
        conflicts: [],
        coverage: { known: 8, total: 10, share: 0.8 },
      } satisfies components["schemas"]["PartnerOverviewOut"];
  }
  if (
    pieces[0] === "partner" &&
    pieces[1] === "hotels" &&
    pieces[3] === "facades" &&
    method === "PUT"
  ) {
    const saved = state();
    saved.mappings = {
      ...saved.mappings,
      [pieces[2]!]: (data as components["schemas"]["FacadesIn"]).mappings,
    };
    save(saved);
    return { changedFacts: [] };
  }
  if (
    pieces[0] === "partner" &&
    pieces[1] === "requests" &&
    pieces[3] === "decision" &&
    method === "POST"
  ) {
    const saved = state();
    const item = required(saved.bookings?.[pieces[2]!]);
    const decision = data as components["schemas"]["DecisionIn"];
    item.booking = { ...item.booking, status: decision.status, hotelReply: decision.reply };
    save(saved);
    return item.booking;
  }
  if (pieces[0] === "partner" && method === "POST") {
    const saved = state();
    const question =
      pieces[1] === "questions"
        ? required(demoQuestions.find((item) => item.id === pieces[2]))
        : undefined;
    const fact = required(
      hotels
        .flatMap((hotel) => hotel.facts)
        .find((item) =>
          question
            ? item.hotelId === question.hotelId && item.characteristic === question.characteristic
            : item.id === pieces[2],
        ),
    );
    const text = String(data["text"] ?? "Подтверждено в демо-режиме");
    const changed: components["schemas"]["FactOut"] = {
      ...fact,
      statement: `${fact.characteristic === "pets_policy" ? "Размещение с питомцем" : "Уточнение отеля"}: ${text}`,
      source: "hotelier",
      sourceLabel: "Имитация ответа отельера",
      status: "ok",
      confidence: 0.95,
      value: !/нельзя|не разреш|запрещ/i.test(text),
    };
    saved.facts[fact.id] = changed;
    if (question) saved.answered = [...new Set([...saved.answered, question.id])];
    save(saved);
    if (question)
      return {
        answerId: "demo-answer",
        parsed: { text },
        parseConfidence: 0.95,
        parser: "local-demo",
        changedFacts: [changed],
        clarification: "Факт обновлён. Ответ сохранён в демо-профиле отеля.",
      } satisfies components["schemas"]["AnswerOut"];
    return { changedFacts: [changed] } satisfies components["schemas"]["ChangedFactsOut"];
  }
  throw new ApiError(
    501,
    "Этот шаг пока не смоделирован в демо-режиме. Настоящий запрос не отправлен.",
    "DEMO_UNSUPPORTED",
  );
}

function wait(ms: number, signal?: AbortSignal) {
  signal?.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Отменено", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function handleDemoRequest(path: string, options: ApiOptions) {
  const delay =
    path === "/intents" ? 650 : path === "/searches" ? 900 : options.method === "POST" ? 650 : 180;
  await wait(typeof window === "undefined" ? 0 : delay, options.signal);
  options.signal?.throwIfAborted();
  return demoResponse(path, options);
}
