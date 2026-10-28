import { afterEach, describe, expect, it, vi } from "vitest";
import {
  demoTravelOption,
  drivingOption,
  fetchDrivingOption,
  sortTravelOptions,
  travelTime,
  yandexDirections,
  type TravelOption,
} from "./travel-options";
import type { RouteData } from "./geo";

const option = (mode: TravelOption["mode"], minutes: number | null): TravelOption => ({
  mode,
  minutes,
  distanceM: null,
  note: "",
});
const payload = {
  code: "Ok",
  routes: [
    {
      duration: 194,
      distance: 1680,
      geometry: {
        type: "LineString",
        coordinates: [
          [39.7, 43.6],
          [39.71, 43.61],
        ],
      },
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());

describe("ways to reach the destination", () => {
  it("sorts known journey times first and unknown modes last without mutating the input", () => {
    const choices = [option("walk", 22), option("transit", null), option("car", 6)];
    expect(sortTravelOptions(choices).map((choice) => choice.mode)).toEqual([
      "car",
      "walk",
      "transit",
    ]);
    expect(choices.map((choice) => choice.mode)).toEqual(["walk", "transit", "car"]);
    expect(
      sortTravelOptions([option("walk", 2), option("car", 7), option("transit", 5)]).map(
        (choice) => choice.mode,
      ),
    ).toEqual(["walk", "transit", "car"]);
  });
  it("keeps equal displayed times stable and treats invalid times as unavailable", () => {
    expect(
      sortTravelOptions([option("walk", 1.2), option("car", 1.1), option("transit", NaN)]).map(
        (choice) => choice.mode,
      ),
    ).toEqual(["walk", "car", "transit"]);
    expect(
      sortTravelOptions([option("walk", null), option("car", 0), option("transit", -1)])[0]?.mode,
    ).toBe("car");
    expect(travelTime(null)).toBe("Нет расчёта");
    expect(travelTime(0)).toBe("< 1 мин");
    expect(travelTime(3.2)).toBe("4 мин");
    expect(travelTime(80)).toBe("1 ч 20 мин");
  });
  it("converts routing duration from seconds and preserves the actual driving geometry", () => {
    const result = drivingOption(payload, "Маяк");
    expect(result.minutes).toBe(194 / 60);
    expect(result.distanceM).toBe(1680);
    expect(result.drawing?.geometry.coordinates).toEqual(payload.routes[0]!.geometry.coordinates);
    expect(result.note).toContain("Без пробок");
    expect(() => drivingOption({ code: "NoRoute", routes: [] }, "Пляж")).toThrow();
    expect(() =>
      drivingOption({ ...payload, routes: [{ ...payload.routes[0], duration: -1 }] }, "Пляж"),
    ).toThrow();
    expect(() =>
      drivingOption(
        {
          ...payload,
          routes: [
            {
              ...payload.routes[0],
              geometry: {
                type: "LineString",
                coordinates: [
                  [NaN, 43],
                  [39, 43],
                ],
              },
            },
          ],
        },
        "Пляж",
      ),
    ).toThrow();
  });
  it("requests a driving calculation without credentials and does not fall back to a straight line", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)));
    vi.stubGlobal("fetch", request);
    await fetchDrivingOption([39.7, 43.6], [39.71, 43.61], "Пляж", new AbortController().signal);
    const [url, options] = request.mock.calls[0]!;
    expect(String(url)).toContain("/route/v1/driving/39.7,43.6;39.71,43.61");
    expect(options.credentials).toBe("omit");
    expect(String(url)).toContain("geometries=geojson");
    request.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    await expect(
      fetchDrivingOption([39.7, 43.6], [39.71, 43.61], "Пляж", new AbortController().signal),
    ).rejects.toThrow();
  });
  it("opens each mode with the original coordinates in Yandex Maps", () => {
    for (const [mode, rtt] of [
      ["walk", "pd"],
      ["car", "auto"],
      ["transit", "mt"],
    ] as const) {
      const url = new URL(yandexDirections([39.7, 43.6], [39.71, 43.61], mode));
      expect(url.searchParams.get("rtt")).toBe(rtt);
      expect(url.searchParams.get("rtext")).toBe("43.6,39.7~43.61,39.71");
    }
  });
  it("uses explicitly synthetic times for demo car and public transport and preserves endpoints", () => {
    const walking = {
      there: { minutes: 18, lengthM: 1200 },
      geometry: {
        type: "LineString",
        coordinates: [
          [39.7, 43.6],
          [39.71, 43.61],
        ],
      },
      targetName: "Парк",
    } as RouteData;
    for (const mode of ["car", "transit"] as const) {
      const result = demoTravelOption(mode, walking);
      expect(result.minutes).toBeGreaterThan(0);
      expect(result.note).toContain("Демо");
      expect(result.drawing?.geometry.coordinates[0]).toEqual(walking.geometry.coordinates[0]);
      expect(result.drawing?.geometry.coordinates.at(-1)).toEqual(
        walking.geometry.coordinates.at(-1),
      );
    }
  });
});
