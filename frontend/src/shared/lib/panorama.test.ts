import { describe, expect, it } from "vitest";
import { readPanorama } from "./panorama";

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
});
