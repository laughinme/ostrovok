import { describe, expect, it } from "vitest";
import { flightCurve, globePosition } from "./globe-geometry";
import { PINS } from "./globe-pins";

const routes = PINS.slice(1).map((to, index) => {
  const from = PINS[index]!;
  return [`${from.name} → ${to.name}`, from, to] as const;
});

describe("globe flight routes", () => {
  it.each(routes)("%s connects both houses without crossing the globe", (_, from, to) => {
    const curve = flightCurve(from, to);
    const departure = globePosition(from.lat, from.lon, 1.025);
    const arrival = globePosition(to.lat, to.lon, 1.025);

    expect(curve.getPoint(0).distanceTo(departure)).toBeLessThan(1e-8);
    expect(curve.getPoint(1).distanceTo(arrival)).toBeLessThan(1e-8);
    expect(curve.getPoint(0.5).length()).toBeGreaterThan(1.18);

    for (const point of curve.getPoints(48)) {
      expect(point.toArray().every(Number.isFinite)).toBe(true);
      expect(point.length()).toBeGreaterThan(1.02);
    }
  });
});
