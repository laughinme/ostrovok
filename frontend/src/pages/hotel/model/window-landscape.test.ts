import { describe, expect, it } from "vitest";
import { landscapeY, windowLandscape } from "./window-landscape";
import type { WindowData } from "./geo";

type Ray = WindowData["horizon"][number];
const ray = (azimuthDeg: number, kind: Ray["kind"], angleDeg: number | null = 10): Ray => ({
  azimuthDeg,
  kind,
  angleDeg,
  seaLowDeg: null,
  seaHighDeg: null,
});
const windowData = (horizon: Ray[]): WindowData => ({
  hotelId: "hotel",
  facade: "N",
  floor: 3,
  date: "2026-11-15",
  horizon,
  peaks: [],
  sunPath: [],
  sunrise: { at: "2026-11-15T07:00:00+03:00", azimuthDeg: 115, elevationDeg: 0 },
  sunset: { at: "2026-11-15T17:00:00+03:00", azimuthDeg: 245, elevationDeg: 0 },
  appearance: null,
  disappearance: null,
  seaFraction: 0,
  minimumSeaFloor: null,
  timezone: "Europe/Moscow",
  attribution: "OSM",
  caveats: [],
});

describe("calculated window landscape", () => {
  it("unwraps north and preserves the calculated skyline", () => {
    const scene = windowLandscape(
      windowData([ray(350, "building", 20), ray(0, "building", 10), ray(10, "building", 5)]),
    );
    expect(scene.samples.map((sample) => sample.offset)).toEqual([-10, 0, 10]);
    expect(scene.samples.map((sample) => sample.x)).toEqual([0, 480, 960]);
    expect(scene.obstacles[0]!.path).toContain(`L480,${landscapeY(10)}`);
    expect(scene.obstacles[0]!.path).toContain(`L960,${landscapeY(5)}`);
    expect(scene.sea).toEqual([]);
  });
  it("keeps terrain, buildings and missing data separate", () => {
    const scene = windowLandscape(
      windowData([
        ray(340, "building"),
        ray(350, "terrain", 5),
        ray(0, "unknown", null),
        ray(10, "sky", 0),
        ray(20, "building", 3),
      ]),
    );
    expect(scene.obstacles.map((item) => item.kind)).toEqual(["building", "terrain", "building"]);
    expect(scene.unknown).toHaveLength(1);
    expect(scene.unknown[0]!.left).toBeGreaterThan(0);
    expect(scene.unknown[0]!.width).toBeGreaterThan(0);
    expect(scene.buildings.every((building) => building.left < 120 || building.left >= 840)).toBe(
      true,
    );
    expect(scene.buildings.map((building) => building.left)).toEqual([0, 840]);
  });
  it("shows sea only inside visible bands and never bridges unknown or blocked directions", () => {
    const sea = (azimuth: number): Ray => ({
      ...ray(azimuth, "sea", 0),
      seaLowDeg: -7,
      seaHighDeg: 0,
    });
    const scene = windowLandscape(
      windowData([
        sea(340),
        ray(350, "building"),
        sea(0),
        { ...sea(10), kind: "unknown" },
        sea(20),
      ]),
    );
    expect(scene.sea).toHaveLength(3);
    expect(scene.sea.every((path) => path.includes(String(landscapeY(-7))))).toBe(true);
    expect(windowLandscape({ ...windowData([ray(0, "building")]), seaFraction: 1 }).sea).toEqual(
      [],
    );
    expect(windowLandscape(windowData([{ ...sea(0), seaLowDeg: 5, seaHighDeg: 0 }])).sea).toEqual(
      [],
    );
  });
  it("lowers obstructions for higher floors without hiding low-floor buildings", () => {
    const low = windowLandscape(windowData([ray(350, "building", 25), ray(10, "building", 25)]));
    const high = windowLandscape(windowData([ray(350, "building", 5), ray(10, "building", 5)]));
    expect(low.buildings[0]!.roof).toBeLessThan(high.buildings[0]!.roof);
    expect(low.buildings[0]!.roof).toBeGreaterThan(0);
    expect(low.obstacles).toHaveLength(1);
  });
  it("does not fabricate geometry when there is no horizon", () => {
    const scene = windowLandscape(windowData([]));
    expect(scene.obstacles).toEqual([]);
    expect(scene.sea).toEqual([]);
    expect(scene.buildings).toEqual([]);
  });
});
