import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hotelFromApi,
  type ApiFact,
  type ApiHotel,
  type ApiIntent,
  type ApiMatch,
} from "@/entities/hotel";
import { api, ApiError } from "@/shared/api";
import { intentForCriteria } from "../src/features/hotel-search/model/api-search";
import { createHotelDetails } from "../src/pages/hotel/model/hotel-details";
import { detailFactFromApi } from "../src/pages/hotel/model/api-hotel-details";

const fixture: ApiHotel = {
  id: "7327e328-ccdc-5b12-ab77-e6754dc560e7",
  osmId: "node/11878294032",
  name: "Отель из API",
  area: "Адлер",
  address: "Улица 1",
  location: [39.9, 43.4],
  floors: 3,
  facades: ["N", "SE"],
  stars: null,
  priceFromDemo: 4200,
  demo: { rating: 9.2, ratingLabel: "Превосходно", tagline: "Демо", amenities: [] },
  rooms: [],
  facts: [],
  unknowns: [],
  nearby: [],
};
const fact: ApiFact = {
  id: "fact-1",
  hotelId: fixture.id,
  characteristic: "night_noise",
  statement: "Ночью шумно",
  scopeText: "весь отель",
  scope: {},
  value: false,
  confidence: 0.9,
  confidenceLabel: "точно",
  source: "computed",
  sourceLabel: "расчёт",
  method: "OSM",
  observedAt: "2026-10-28T06:00:00Z",
  status: "ok",
  evidence: [],
  caveats: [],
  isDemo: false,
};
const intent: ApiIntent = {
  chips: [
    {
      id: "quiet",
      characteristic: "night_noise",
      label: "Тишина",
      importance: "important",
      checkable: "compute",
      fromProfile: false,
    },
  ],
  trip: {},
  planner: "rules",
};
const match: ApiMatch = {
  hotelId: fixture.id,
  name: fixture.name,
  area: fixture.area,
  location: fixture.location,
  score: 0.74,
  disappointmentRisk: 0.18,
  perChip: [
    { chipId: "quiet", verdict: "unknown", probability: null, line: "Данных для этого этажа нет" },
  ],
  thumbnail: { kind: "facades", params: {} },
};

afterEach(() => vi.unstubAllGlobals());

describe("backend hotel contract", () => {
  it("shows server-provided nearby places and preserves every room orientation", () => {
    const details = createHotelDetails(
      hotelFromApi({
        ...fixture,
        nearby: [{ kind: "park", name: "Парк у отеля", distanceText: "350 м" }],
        rooms: [
          {
            id: "room-north",
            name: "Номер с балконом",
            area: 25,
            bed: "Двуспальная",
            capacity: 2,
            facades: ["N", "SW"],
            floors: [2, 3],
            confirmedByHotel: true,
            rates: [],
          },
        ],
      }),
    );
    expect(details.nearby).toEqual([["park", "Парк у отеля", "350 м"]]);
    expect(details.rooms[0]?.orientationLabel).toBe("Север + Юго-запад");
    expect(details.rooms[0]?.rates).toEqual([]);
    expect(details.bestRoom).toBe("Номер с балконом");
    expect(details.bestFloor).toBe(2);
  });
  it("keeps evidence and source links available in the detail panel", () => {
    const evidence = {
      kind: "noise_facades" as const,
      summary: "Расчёт по открытым данным",
      attribution: "OpenStreetMap",
    };
    const mapped = detailFactFromApi(
      { ...fact, evidence: [evidence] },
      {
        ...fact,
        evidence: [evidence],
        sources: [
          {
            kind: "open_data",
            label: "Карта",
            ref: "https://www.openstreetmap.org/",
            observedAt: "2026-10-28T00:00:00Z",
            confidence: 0.8,
          },
        ],
        history: [],
      },
    );
    expect(mapped.group).toBe("Тишина ночью");
    expect(mapped.evidenceItems).toEqual([
      { summary: evidence.summary, attribution: evidence.attribution },
    ]);
    expect(mapped.sources).toEqual([["Карта", "28.10.2026", "https://www.openstreetmap.org/"]]);
  });
  it("preserves UUIDs, coordinates and unknown values instead of using demo properties", () => {
    const hotel = hotelFromApi(fixture);
    expect(hotel.id).toBe(fixture.id);
    expect(hotel.lngLat).toEqual([39.9, 43.4]);
    expect(hotel.unknownCriteria).toContain("work");
    expect(hotel.image).toBe("/hotel-placeholder.svg");
    expect(createHotelDetails(hotel).rooms).toEqual([]);
    expect(createHotelDetails(hotel).noise.night.NE[1]).toBe("нет данных");
  });
  it("interprets confidence in a negative fact as a low probability of a positive wish", () => {
    const hotel = hotelFromApi({ ...fixture, facts: [fact] });
    expect(hotel.scores.quiet).toBe(10);
    expect(hotel.facts[0]?.status).toBe("computed");
  });
  it("keeps the server's scoped unknown verdict even if a broader fact is known", () => {
    const hotel = hotelFromApi({ ...fixture, facts: [fact] }, match, intent);
    expect(hotel.unknownCriteria).toContain("quiet");
    expect(hotel.searchMatch?.score).toBe(0.74);
    expect(createHotelDetails(hotel).wish["quiet"]?.[0]).toBeNull();
  });
  it("retains actual room and rate IDs, capacity and prices without inventing tariffs", () => {
    const hotel = hotelFromApi({
      ...fixture,
      rooms: [
        {
          id: "node/11878294032:room:1",
          name: "Стандарт",
          area: 20,
          bed: "Двуспальная",
          capacity: 1,
          facades: [],
          floors: null,
          confirmedByHotel: false,
          rates: [
            {
              id: "node/11878294032:room:1:flex",
              meal: "Без питания",
              cancel: "Условия",
              pay: "В отеле",
              priceDemo: 4200,
            },
          ],
        },
      ],
    });
    const details = createHotelDetails(hotel);
    expect(details.rooms).toHaveLength(1);
    expect(details.rooms[0]).toMatchObject({
      id: "node/11878294032:room:1",
      capacity: 1,
      facades: [],
    });
    expect(details.rooms[0]?.rates).toEqual([
      {
        id: "node/11878294032:room:1:flex",
        meal: "Без питания",
        cancel: "Условия",
        pay: "В отеле",
        price: 4200,
      },
    ]);
  });
  it("preserves wishes outside the eight frontend filters and removes only deselected filters", () => {
    const other = {
      ...intent.chips[0]!,
      id: "c2",
      characteristic: "blackout",
      label: "Плотные шторы",
    };
    const result = intentForCriteria({ ...intent, chips: [...intent.chips, other] }, ["sea"]);
    expect(result.map((chip) => chip.characteristic)).toEqual(["blackout", "sea_view"]);
    expect(result[0]).toEqual(other);
  });
});

describe("HTTP contract", () => {
  it("passes camelCase bodies and a Bearer token through the API transport", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "booking-1" }), { status: 201 }));
    vi.stubGlobal("fetch", fetcher);
    const body = { hotelId: fixture.id, roomTypeId: "room-1", ratePlanId: "rate-1" };
    await api("/bookings", { method: "POST", body, token: "test-token" });
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toMatch(/\/api\/v1\/bookings$/);
    expect(options.body).toBe(JSON.stringify(body));
    expect(options.headers.get("Authorization")).toBe("Bearer test-token");
  });
  it("surfaces the backend problem instead of replacing it with mock data", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ detail: "Hotel not found", error_code: "HOTEL_NOT_FOUND" }),
            { status: 404 },
          ),
        ),
    );
    await expect(api("/hotels/missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      code: "HOTEL_NOT_FOUND",
    });
  });
  it("rejects a non-JSON success response from a broken proxy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Not API</html>")));
    await expect(api("/hotels")).rejects.toBeInstanceOf(ApiError);
  });
});
