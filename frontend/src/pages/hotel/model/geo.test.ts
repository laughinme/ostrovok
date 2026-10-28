import { describe, expect, it } from "vitest";
import {
  elevationPath,
  noiseFacades,
  solarVisibility,
  relativeAzimuth,
  tripDates,
  type NoiseData,
} from "./geo";

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
      attribution: "OSM",
      caveats: [],
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

describe("window visibility", () => {
  const data: import("./geo").WindowData = {
    hotelId: "hotel",
    facade: "N",
    floor: 3,
    date: "2026-11-15",
    horizon: [],
    peaks: [],
    sunPath: [],
    sunrise: { at: "2026-11-15T07:00:00+03:00", azimuthDeg: 0, elevationDeg: -0.5 },
    sunset: { at: "2026-11-15T17:00:00+03:00", azimuthDeg: 245, elevationDeg: -0.5 },
    appearance: null,
    disappearance: null,
    seaFraction: 0,
    minimumSeaFloor: null,
    timezone: "Europe/Moscow",
    attribution: "OSM",
    caveats: [],
  };
  it("distinguishes missing horizon, blocked events and events outside the window", () => {
    expect(solarVisibility(data, "sunrise")).toBe("нет данных");
    const horizon = [350, 0, 10].map((azimuthDeg) => ({
      azimuthDeg,
      angleDeg: 0,
      kind: "sea" as const,
      seaLowDeg: -5,
      seaHighDeg: 0,
    }));
    expect(solarVisibility({ ...data, horizon }, "sunrise")).toBe("виден");
    expect(solarVisibility({ ...data, horizon }, "sunset")).toBe("вне окна");
    expect(
      solarVisibility(
        { ...data, horizon: horizon.map((ray) => ({ ...ray, angleDeg: 10, kind: "terrain" })) },
        "sunrise",
      ),
    ).toBe("закрыт горизонтом");
    expect(
      solarVisibility(
        { ...data, horizon: horizon.map((ray) => ({ ...ray, angleDeg: null, kind: "unknown" })) },
        "sunrise",
      ),
    ).toBe("нет данных");
  });
});
