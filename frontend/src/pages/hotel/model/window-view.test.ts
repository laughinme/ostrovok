import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ApiFact } from "@/entities/hotel";
import type { WindowData } from "./geo";
import { calculatedWindowView, demoWindowView, windowViewSummary } from "./window-view";
import { WindowPanorama } from "../ui/window-panorama";

const selection = { facade: "N" as const, floor: 3, date: "2026-11-15" };
const data = (patch: Partial<WindowData> = {}): WindowData => ({
  ...selection,
  hotelId: "hotel",
  horizon: [-60, 0, 60].map((azimuthDeg) => ({
    azimuthDeg,
    angleDeg: 0,
    kind: "sky",
    seaLowDeg: null,
    seaHighDeg: null,
  })),
  peaks: [],
  sunPath: [],
  sunrise: { at: "2026-11-15T07:00:00+03:00", azimuthDeg: 115, elevationDeg: 0 },
  sunset: { at: "2026-11-15T17:00:00+03:00", azimuthDeg: 245, elevationDeg: 0 },
  disappearance: null,
  appearance: null,
  seaFraction: 0,
  minimumSeaFloor: null,
  timezone: "Europe/Moscow",
  attribution: "OSM",
  caveats: [],
  ...patch,
});
const fact = (patch: Partial<ApiFact> = {}): ApiFact => ({
  id: "trees",
  hotelId: "hotel",
  characteristic: "tree_view",
  statement: "Деревья видны из окна",
  scopeText: "Север, 1–3 этажи",
  scope: { facades: ["N"], floorFrom: 1, floorTo: 3, months: [11] },
  value: true,
  confidence: 0.9,
  confidenceLabel: "точно",
  source: "hotelier",
  sourceLabel: "Отель",
  method: "Ответ отеля",
  observedAt: "2026-10-28",
  status: "ok",
  evidence: [],
  caveats: [],
  isDemo: false,
  ...patch,
});

describe("window illustration from visibility data", () => {
  it("does not invent sea, mountains, houses or trees from a clear or missing horizon", () => {
    expect(calculatedWindowView(selection, data()).objects).toEqual([]);
    expect(calculatedWindowView(selection).known).toBe(false);
    const unknown = data({
      horizon: data().horizon.map((ray) => ({ ...ray, kind: "unknown", angleDeg: null })),
    });
    expect(calculatedWindowView(selection, unknown).known).toBe(false);
    expect(calculatedWindowView(selection, unknown).objects).toEqual([]);
  });
  it("keeps sea separated by blocked and unknown directions", () => {
    const horizon = data().horizon.map((ray, index) => ({
      ...ray,
      kind: index === 1 ? ("unknown" as const) : ("sea" as const),
      angleDeg: index === 1 ? null : 0,
      seaLowDeg: -10,
      seaHighDeg: 0,
    }));
    const scene = calculatedWindowView(selection, data({ horizon, seaFraction: 0.6 }));
    expect(scene.sea).toHaveLength(2);
    expect(scene.unknown).toHaveLength(1);
    expect(scene.sea[0]!.to).toBeLessThan(scene.sea[1]!.from);
    expect(calculatedWindowView(selection, data({ horizon, seaFraction: 0 })).sea).toEqual([]);
  });
  it("uses reported peaks for mountains instead of treating every hill as a mountain", () => {
    const terrain = data({
      horizon: data().horizon.map((ray) => ({ ...ray, kind: "terrain", angleDeg: 6 })),
    });
    expect(calculatedWindowView(selection, terrain).mountains).toEqual([]);
    const peaks = [{ ref: "peak", name: "Гора", distanceM: 2000, azimuthDeg: 0, elevationDeg: 12 }];
    expect(calculatedWindowView(selection, { ...terrain, peaks }).objects).toEqual(["Горы"]);
    expect(
      calculatedWindowView(selection, { ...terrain, peaks: [{ ...peaks[0]!, azimuthDeg: 180 }] })
        .mountains,
    ).toEqual([]);
  });
  it("keeps building dimensions stable and moves the foreground as one layer", () => {
    const low = data({
      horizon: data().horizon.map((ray) => ({ ...ray, kind: "building", angleDeg: 25 })),
    });
    const high = { ...low, floor: 8, horizon: low.horizon.map((ray) => ({ ...ray, angleDeg: 5 })) };
    const lowScene = calculatedWindowView(selection, low);
    const highScene = calculatedWindowView({ ...selection, floor: 8 }, high);
    expect(highScene.buildings).toEqual(lowScene.buildings);
    expect(highScene.foregroundOffset).toBeGreaterThan(lowScene.foregroundOffset);
    expect(highScene.foregroundOffset).toBeLessThanOrEqual(162);
    expect(calculatedWindowView({ ...selection, floor: 8 }, low).known).toBe(false);
  });
  it("adds trees only for a current positive fact matching side, floor and month", () => {
    expect(calculatedWindowView(selection, data(), [fact()]).objects).toEqual(["Деревья"]);
    for (const invalid of [
      fact({ value: false }),
      fact({ status: "stale" }),
      fact({ status: "conflict" }),
      fact({ isDemo: true }),
      fact({ validUntil: "2026-11-01" }),
      fact({ scope: { facades: ["S"] } }),
      fact({ scope: { floorFrom: 4 } }),
      fact({ scope: { months: [6] } }),
      fact({ scope: { roomTypeIds: ["other-room"] } }),
    ]) {
      expect(calculatedWindowView(selection, data(), [invalid]).trees).toEqual([]);
    }
    expect(calculatedWindowView(selection, data(), [fact(), fact({ value: false })]).trees).toEqual(
      [],
    );
  });
  it("renders the same prefab library for calculated claims and the demo without WebGL", () => {
    const scene = calculatedWindowView(selection, undefined, [
      fact(),
      fact({ characteristic: "sea_view" }),
      fact({ characteristic: "mountain_view" }),
    ]);
    const svg = renderToStaticMarkup(createElement(WindowPanorama, { scene, floor: 3 }));
    expect(svg).toContain('data-window-object="tree"');
    expect(svg).toContain('data-window-object="sea"');
    expect(svg).toContain('data-window-object="mountain"');
    expect(svg).not.toContain("canvas");
    expect(demoWindowView("NE", 4).objects).toContain("Горы");
    expect(demoWindowView("SW", 4).objects).toContain("Море");
    expect(demoWindowView("NE", 4).objects).not.toContain("Море");
    expect(demoWindowView("SW", 8).buildings).toEqual(demoWindowView("SW", 1).buildings);
  });
});

describe("predictable floor changes", () => {
  it("preserves every building, tree, and mountain shape across all demo floors", () => {
    for (const facade of ["NE", "SE", "SW", "NW"] as const) {
      const first = demoWindowView(facade, 1);
      for (let floor = 2; floor <= 20; floor++) {
        const scene = demoWindowView(facade, floor);
        expect(scene.buildings).toEqual(first.buildings);
        expect(scene.trees).toEqual(first.trees);
        expect(scene.mountains).toEqual(first.mountains);
        expect(scene.foregroundOffset).toBeGreaterThanOrEqual(
          demoWindowView(facade, floor - 1).foregroundOffset,
        );
        expect(scene.foregroundOffset).toBeLessThanOrEqual(162);
      }
    }
  });
  it("opens the marine horizon above the same roofs instead of resizing them", () => {
    const obstructed = (scene: ReturnType<typeof demoWindowView>) =>
      scene.buildings.some(
        (building) =>
          scene.sea.some((sea) => building.to > sea.from && building.from < sea.to) &&
          building.roof + scene.foregroundOffset < 270,
      );
    expect(obstructed(demoWindowView("SW", 4))).toBe(true);
    expect(obstructed(demoWindowView("SW", 8))).toBe(false);
    const open = calculatedWindowView(
      selection,
      data({
        seaFraction: 1,
        horizon: data().horizon.map((ray) => ({
          ...ray,
          kind: "building",
          angleDeg: -2,
          seaLowDeg: -6,
          seaHighDeg: 0,
        })),
      }),
    );
    expect(obstructed(open)).toBe(false);
  });
  it("gives a different explanation for partial, open, and unknown views", () => {
    const partial = demoWindowView("SW", 4);
    const open = demoWindowView("SW", 8);
    expect(windowViewSummary(partial, 0.37).title).toBe("Море видно частично");
    expect(windowViewSummary(open, 1).title).toBe("Открытый вид на море");
    expect(windowViewSummary(calculatedWindowView(selection), null).title).toBe(
      "Вид пока неизвестен",
    );
    expect(windowViewSummary(demoWindowView("NE", 4), 0).title).toBe("Вид на горы");
  });
});
