import { describe, expect, it } from "vitest";
import { elevationPath, noiseFacades, relativeAzimuth, tripDates, type NoiseData } from "./geo";

describe("hotel geo mappings", () => {
  it("preserves trip dates across a month boundary", () => {
    expect(tripDates({ from: "2027-01-30", to: "2027-02-04" })).toEqual({
      from: "2027-01-30",
      to: "2027-02-04",
      date: "2027-01-30",
      fallback: false,
    });
    expect(tripDates({ from: "2027-01-30" }).to).toBe("2027-02-04");
    expect(tripDates().date).toBe("2026-11-15");
  });
  it("keeps all hotel facades and never fills absent noise with another side", () => {
    const level = { indexDb: 0, category: null, confidence: 0.6, sources: [] };
    const data: NoiseData = {
      hotelId: "hotel",
      facades: [{ facade: "N", day: level, night: level }],
      completeness: 0.5,
      unmodelledRefs: [],
    };
    const sides = noiseFacades(["N", "NE", "E", "SE", "S", "SW", "W", "NW"], data, "night");
    expect(sides).toHaveLength(8);
    expect(sides[0]?.text).toBe("0");
    expect(sides.slice(1).every((side) => side.text === "нет данных")).toBe(true);
  });
  it("unwraps north without reversing the horizon", () => {
    expect(relativeAzimuth(350, "N")).toBe(-10);
    expect(relativeAzimuth(10, "N")).toBe(10);
  });
  it("breaks elevation lines at missing samples and preserves zero elevation", () => {
    expect(
      elevationPath([
        [0, 0],
        [50, null],
        [100, 10],
      ]),
    ).toBe("M10,90  M390,20");
    expect(elevationPath([[0, null]])).toBe("");
  });
});
