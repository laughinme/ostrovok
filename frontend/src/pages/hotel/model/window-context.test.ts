import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
  insidePolygon,
  schematicContext,
  contextTrees,
  type WindowContexts,
} from "./window-context";
import type { WindowData } from "./geo";
import { WindowContextFallback } from "../ui/window-context-fallback";

const contexts = JSON.parse(
  readFileSync(new URL("../../../../public/data/window-contexts.json", import.meta.url), "utf8"),
) as WindowContexts;
const data: WindowData = {
  hotelId: "hotel",
  facade: "NE",
  floor: 3,
  date: "2026-11-15",
  horizon: [],
  peaks: [],
  sunPath: [],
  sunrise: { at: "2026-11-15T07:00:00Z", azimuthDeg: 115, elevationDeg: 0 },
  sunset: { at: "2026-11-15T17:00:00Z", azimuthDeg: 245, elevationDeg: 0 },
  disappearance: null,
  appearance: null,
  seaFraction: 0,
  minimumSeaFloor: null,
  timezone: "Europe/Moscow",
  attribution: "OSM",
  caveats: [],
};

describe("3D hotel surroundings", () => {
  it("ships valid local geometry for all 200 hotels with attribution and a marked hotel", () => {
    expect(Object.keys(contexts.hotels)).toHaveLength(200);
    expect(contexts.attribution).toContain("OpenStreetMap");
    for (const context of Object.values(contexts.hotels)) {
      expect(context.buildings.some((building) => building.hotel)).toBe(true);
      for (const building of context.buildings) {
        expect(building.points.length).toBeGreaterThanOrEqual(3);
        expect(building.height).toBeGreaterThan(0);
        expect(Number.isFinite(building.height)).toBe(true);
        expect(
          building.points.every((point) =>
            point.every(
              (value) => Number.isFinite(value) && Math.abs(value) <= context.radius + 0.1,
            ),
          ),
        ).toBe(true);
      }
    }
  });
  it("uses separate OSM footprints, streets and coastline at Cascade", () => {
    const context = contexts.hotels["node/11866202895"]!;
    expect(context.buildings.length).toBeGreaterThan(10);
    expect(context.roads.length).toBeGreaterThan(0);
    expect(context.water.length).toBeGreaterThan(0);
    expect(context.buildings.find((building) => building.hotel)?.id).toBe("way/679416881");
  });
  it("keeps unknown and blocked directions free of invented sea in the schematic fallback", () => {
    const horizon: WindowData["horizon"] = [
      { azimuthDeg: 45, angleDeg: null, kind: "unknown", seaLowDeg: -5, seaHighDeg: 0 },
      { azimuthDeg: 30, angleDeg: 15, kind: "building", seaLowDeg: null, seaHighDeg: null },
    ];
    const context = schematicContext({ ...data, horizon });
    expect(context.water).toEqual([]);
    expect(context.buildings.filter((building) => !building.hotel)).toHaveLength(1);
    expect(
      context.buildings.every(
        (building) => Number.isFinite(building.height) && building.height > 0,
      ),
    ).toBe(true);
    expect(schematicContext(data).buildings.filter((building) => !building.hotel)).toEqual([]);
  });
  it("places decorative trees outside buildings and water consistently", () => {
    const context = contexts.hotels["node/11866202895"]!;
    const trees = contextTrees(context);
    expect(contextTrees(context)).toEqual(trees);
    expect(trees.length).toBeLessThanOrEqual(28);
    expect(
      trees.every((point) => context.water.every((polygon) => !insidePolygon(point, polygon))),
    ).toBe(true);
    expect(
      trees.every((point) =>
        context.buildings.every((building) => !insidePolygon(point, building.points)),
      ),
    ).toBe(true);
  });
  it("renders a volumetric fallback without a browser or GPU", () => {
    const html = renderToStaticMarkup(
      createElement(WindowContextFallback, { context: contexts.hotels["node/11866202895"]! }),
    );
    expect(html).toContain("Объёмная схема окрестностей отеля");
    expect(html.match(/<polygon/g)!.length).toBeGreaterThan(100);
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("undefined");
  });
});
