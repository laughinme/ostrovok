import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ApiFact } from "@/entities/hotel";
import type { WindowData } from "./geo";
import { calculatedWindowView, demoWindowView } from "./window-view";
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
  it("moves building roofs down with a lower calculated obstruction angle", () => {
    const low = data({
      horizon: data().horizon.map((ray) => ({ ...ray, kind: "building", angleDeg: 25 })),
    });
    const high = { ...low, floor: 8, horizon: low.horizon.map((ray) => ({ ...ray, angleDeg: 5 })) };
    expect(
      calculatedWindowView({ ...selection, floor: 8 }, high).buildings[0]!.roof,
    ).toBeGreaterThan(calculatedWindowView(selection, low).buildings[0]!.roof);
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
    expect(demoWindowView("SW", 8).buildings[0]!.roof).toBeGreaterThan(
      demoWindowView("SW", 1).buildings[0]!.roof,
    );
  });
});
