import { describe, expect, it } from "vitest";
import { nearestFacade, pointerBearing, unwrapBearing } from "./noise-compass";
import { FACADE_ANGLE, type GeoFacade } from "./geo";

describe("facade compass", () => {
  it("reads clockwise bearings with north at the top", () => {
    expect(pointerBearing(0, -100)).toBe(0);
    expect(pointerBearing(100, 0)).toBe(90);
    expect(pointerBearing(0, 100)).toBe(180);
    expect(pointerBearing(-100, 0)).toBe(270);
    expect(pointerBearing(100, -100)).toBe(45);
  });
  it("takes the short path across north and keeps accumulated turns", () => {
    expect(unwrapBearing(315, 45)).toBe(405);
    expect(unwrapBearing(45, 315)).toBe(-45);
    expect(unwrapBearing(719, 1)).toBe(721);
    expect(unwrapBearing(-359, 359)).toBe(-361);
  });
  it("selects only mapped sides, including when crossing north", () => {
    const available: GeoFacade[] = ["NE", "SE", "SW", "NW"];
    expect(nearestFacade(359, available)).toBe("NW");
    expect(nearestFacade(1, available)).toBe("NE");
    expect(nearestFacade(177, available)).toBe("SE");
    expect(nearestFacade(226, available)).toBe("SW");
    expect(nearestFacade(610, ["N"])).toBe("N");
    expect(nearestFacade(45, [])).toBeUndefined();
    const everySide = Object.keys(FACADE_ANGLE) as GeoFacade[];
    for (const facade of everySide)
      expect(nearestFacade(FACADE_ANGLE[facade] + 720, everySide)).toBe(facade);
  });
});
