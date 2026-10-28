import { describe, expect, it } from "vitest";
import { directionEndpoint, routePrefix } from "./directions";

describe("hotel directions", () => {
  it("encodes address names without losing the selected coordinate or profile", () => {
    const endpoint = directionEndpoint(
      { key: "place", name: "Кафе & море / вход 2", location: [39.7, 43.6] },
      "stroller",
    );
    const params = new URLSearchParams(endpoint.split("?")[1]);
    expect(params.get("name")).toBe("Кафе & море / вход 2");
    expect(params.get("lon")).toBe("39.7");
    expect(params.get("lat")).toBe("43.6");
    expect(params.get("profile")).toBe("stroller");
    expect(directionEndpoint({ key: "beach", name: "Пляж", preset: "beach" }, "walk")).toBe(
      "routes/beach?profile=walk",
    );
  });
  it("draws the actual route progressively and does not alter its coordinates", () => {
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 3],
    ];
    expect(routePrefix(points, 0)).toEqual([
      [0, 0],
      [0, 0],
    ]);
    expect(routePrefix(points, 0.5)).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    expect(routePrefix(points, 1)).toEqual(points);
    expect(points).toEqual([
      [0, 0],
      [1, 0],
      [1, 3],
    ]);
  });
});
