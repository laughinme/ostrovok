import { describe, expect, it } from "vitest";
import { readPanorama, readPanoramaLayout } from "./panorama";

describe("demo window readings", () => {
  it("preserves the previous southwest reading at floor four", () => {
    expect(readPanorama("SW", 4)).toEqual({ seaShare: 37, sunVisible: true, mountains: false });
  });
  it("preserves the small sea glimpse and hidden sunset on the city side", () => {
    expect(readPanorama("NW", 4)).toMatchObject({ seaShare: 7, sunVisible: false });
    expect(readPanorama("NE", 4)).toMatchObject({ seaShare: 0, mountains: true });
  });
  it("does not reduce sea visibility when moving up a floor", () => {
    for (const facade of ["SW", "SE", "NE", "NW"] as const) {
      const values = Array.from(
        { length: 8 },
        (_, index) => readPanorama(facade, index + 1).seaShare,
      );
      expect(values.every((value) => value >= 0 && value <= 100)).toBe(true);
      expect(values.slice(1).every((value, index) => value >= values[index]!)).toBe(true);
    }
  });
  it("lowers nearby buildings in the view as the observer moves upstairs", () => {
    for (const facade of ["SW", "SE", "NE", "NW"] as const) {
      const low = readPanoramaLayout(facade, 1);
      const high = readPanoramaLayout(facade, 8);
      high.buildings.forEach((building, index) => {
        expect(building.elevation).toBeLessThan(low.buildings[index]!.elevation);
        expect(building.baseElevation).toBeLessThan(low.buildings[index]!.baseElevation);
        expect(building.baseElevation).toBeLessThan(building.elevation);
        expect(building.from).toBeGreaterThanOrEqual(0);
        expect(building.to).toBeLessThanOrEqual(1);
      });
    }
  });
  it("keeps the illustrated sea horizon consistent with the visibility reading", () => {
    const high = readPanoramaLayout("SW", 8);
    expect(readPanorama("SW", 8).seaShare).toBe(100);
    const sea = high.sea!;
    const inSea = high.buildings.filter(
      (building) => building.to > sea.from && building.from < sea.to,
    );
    expect(inSea.length).toBeGreaterThan(0);
    expect(inSea.every((building) => building.elevation < 0)).toBe(true);
    expect(readPanoramaLayout("NE", 4).sea).toBeNull();
  });
});
