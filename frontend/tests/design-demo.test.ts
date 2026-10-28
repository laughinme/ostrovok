import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, registerDemoTransport } from "@/shared/api";
import { demoResponse, handleDemoRequest } from "../src/app/demo/transport";
import { demoSearch, restoreDemoSearch } from "../src/app/demo/search";
import { demoHotels } from "../src/app/demo/fixtures";
import { hotelFromApi } from "@/entities/hotel";
import type { components } from "@/shared/api";

const mode = vi.hoisted(() => ({ value: "demo" as "demo" | "live" }));
vi.mock("@/shared/api/execution-mode", () => ({ getApiMode: () => mode.value }));

beforeEach(() => {
  mode.value = "demo";
  registerDemoTransport(handleDemoRequest);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Real network must not be called");
    }),
  );
});
afterEach(() => {
  registerDemoTransport(undefined);
  vi.unstubAllGlobals();
});

describe("design demo transport", () => {
  it("returns an intent, catalogue and ranked matches without fetching", async () => {
    const intent = await api<components["schemas"]["IntentModel"]>("/intents", {
      method: "POST",
      body: { text: "Тихо, море, с собакой до 10 тыс" },
    });
    expect(intent.chips.map((chip) => chip.characteristic)).toContain("pets_policy");
    expect(intent.trip.budgetPerNight).toBe(10000);
    const catalog = await api<components["schemas"]["HotelOut"][]>("/hotels");
    const result = await api<components["schemas"]["SearchResultOut"]>("/searches", {
      method: "POST",
      body: { text: intent.text, chips: intent.chips, trip: intent.trip, useProfile: false },
    });
    expect(catalog.length).toBeGreaterThan(2);
    expect(catalog.every((hotel) => hotel.facts.every((fact) => fact.isDemo))).toBe(true);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches.every((match) => (match.priceFromDemo ?? 0) <= 10000)).toBe(true);
    expect(hotelFromApi(catalog[0]!).image).not.toBe("/hotel-placeholder.svg");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("restores criteria and dates from a search ID without server state", () => {
    const search = demoSearch({
      text: "Море, 2026-12-01 — 2026-12-06",
      trip: { adults: 3, budgetPerNight: 15000 },
      useProfile: false,
    });
    const restored = restoreDemoSearch(search.searchId, structuredClone(demoHotels));
    expect(restored.intent.trip).toEqual(search.intent.trip);
    expect(restored.intent.chips).toEqual(search.intent.chips);
    expect(restored.matches.map((match) => match.hotelId)).toEqual(
      search.matches.map((match) => match.hotelId),
    );
  });
  it("creates a local booking from the displayed room and rate", async () => {
    const hotel = demoHotels[0]!,
      room = hotel.rooms[0]!,
      rate = room.rates[0]!;
    const result = await api<components["schemas"]["BookingOut"]>("/bookings", {
      method: "POST",
      body: {
        hotelId: hotel.id,
        roomTypeId: room.id,
        ratePlanId: rate.id,
        checkIn: "2026-11-10",
        checkOut: "2026-11-15",
        guests: { adults: 2, children: 0 },
        request: "Выше и потише",
      },
    });
    expect(result.id).toMatch(/^demo-booking-/);
    expect(result.roomTypeId).toBe(room.id);
    expect(result.hotelReply).toContain("не отправляется");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(demoHotels)("loads the beach route and both noise periods for $name", async (hotel) => {
    const route = await api<components["schemas"]["RouteOut"]>(
      `/hotels/${hotel.id}/routes/beach?profile=walk`,
    );
    const beach = hotel.nearby.find((place) => place.kind === "beach")!;
    expect(route.hotelId).toBe(hotel.id);
    expect(route.geometry.coordinates[0]).toEqual(hotel.location);
    expect(route.geometry.coordinates.at(-1)).toEqual(beach.location);
    expect(route.targetName).toBe(beach.name);
    expect(route.there.lengthM).toBe(beach.distanceM);
    expect(route.there.minutes).toBe(
      (
        hotel.facts.find((fact) => fact.characteristic === "beach_walk")!.value as {
          minutes: number;
        }
      ).minutes,
    );
    expect(route.elevationProfile.at(-1)?.[0]).toBe(route.there.lengthM);
    expect(route.elevationProfile.every(([, height]) => height != null)).toBe(true);
    expect(route.back.climbM).toBe(route.there.descentM);
    expect(route.caveats.join(" ")).toContain("Демонстрационный");
    const noise = await api<components["schemas"]["NoiseOut"]>(`/hotels/${hotel.id}/noise`);
    expect(noise.facades.map((side) => side.facade)).toEqual(hotel.facades);
    for (const side of noise.facades) {
      expect(side.day.indexDb).toBeGreaterThan(side.night.indexDb!);
      expect(side.night.sources.length).toBeGreaterThan(0);
      expect(side.day.sources.length).toBeGreaterThan(0);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("supports accessible demo routes and rejects missing hotels and invalid profiles", () => {
    const hotel = demoHotels.find((hotel) => hotel.id.endsWith("dom-na-holme"))!;
    const route = demoResponse(
      `/hotels/${hotel.id}/routes/beach?profile=stroller`,
    ) as components["schemas"]["RouteOut"];
    expect(route.profile).toBe("stroller");
    expect(route.there.steps).toBe(0);
    expect(() => demoResponse(`/hotels/${hotel.id}/routes/beach?profile=invalid`)).toThrow();
    expect(() => demoResponse("/hotels/missing/routes/beach?profile=walk")).toThrow();
    expect(() => demoResponse("/hotels/missing/noise")).toThrow();
  });
  it("records a question and returns the completed demo agent trace without fetching", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    const hotel = demoHotels[0]!;
    const search = demoSearch({ text: "тихий отель", useProfile: false });
    for (const question of hotel.unknowns) {
      const started = await api<components["schemas"]["RunStarted"]>(
        `/searches/${search.searchId}/research`,
        {
          method: "POST",
          body: { characteristic: question.characteristic, hotelIds: [hotel.id] },
        },
      );
      const run = await api<components["schemas"]["AgentRunOut"]>(`/runs/${started.runId}`);
      expect(run.status).toBe("done");
      expect(run.subject?.["hotelIds"]).toEqual([hotel.id]);
      expect(run.steps.at(-1)?.kind).toBe("result");
      expect(
        run.steps.some((step) => step.summary.includes("Реальное сообщение не отправлялось")),
      ).toBe(true);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("blocks unknown demo requests and missing adapters instead of using live API", async () => {
    await expect(api("/new-expensive-agent", { method: "POST" })).rejects.toMatchObject({
      status: 501,
      code: "DEMO_UNSUPPORTED",
    });
    registerDemoTransport(undefined);
    await expect(api("/intents", { method: "POST" })).rejects.toMatchObject({ status: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("cancels simulated loading with the request signal", async () => {
    const controller = new AbortController();
    const pending = api("/intents", { method: "POST", signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses the normal transport again after leaving demo mode", async () => {
    mode.value = "live";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ chips: [], trip: {}, planner: "rules" }))),
    );
    await api("/intents", { method: "POST", body: { text: "Море" } });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("rejects malformed saved searches and unknown hotels locally", () => {
    expect(() => restoreDemoSearch("demo-search-invalid", demoHotels)).toThrow();
    expect(() => demoResponse("/hotels/not-in-the-demo")).toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
