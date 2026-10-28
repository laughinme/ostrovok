import { describe, expect, it } from "vitest";
import { FACADE_ANGLE } from "./geo";
import { facadeRotation, noiseIndexLabel } from "./noise-presentation";

describe("noise presentation", () => {
  it("keeps zero distinct from missing data and agrees with the existing colour thresholds", () => {
    expect(noiseIndexLabel(0)).toBe("Низкий индекс");
    expect(noiseIndexLabel(null)).toBe("Нет расчёта");
    expect(noiseIndexLabel(undefined)).toBe("Нет расчёта");
    expect(noiseIndexLabel(42.9)).toBe("Низкий индекс");
    expect(noiseIndexLabel(43)).toBe("Умеренный индекс");
    expect(noiseIndexLabel(55)).toBe("Повышенный индекс");
  });
  it("turns every selected facade towards the camera, including north", () => {
    for (const angle of Object.values(FACADE_ANGLE)) {
      const azimuth = (angle * Math.PI) / 180;
      const rotation = facadeRotation(angle);
      const x = Math.sin(azimuth) * Math.cos(rotation) - Math.cos(azimuth) * Math.sin(rotation);
      const z = -Math.sin(azimuth) * Math.sin(rotation) - Math.cos(azimuth) * Math.cos(rotation);
      expect(x * 8 - z * 7).toBeCloseTo(0, 8);
      expect(x * 7 + z * 8).toBeGreaterThan(0);
    }
  });
});
