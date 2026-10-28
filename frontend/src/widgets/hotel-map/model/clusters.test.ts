import { describe, expect, it } from "vitest";
import { clusterHotels } from "./clusters";
import type { Hotel } from "@/entities/hotel";
const item = (id: string, lngLat: [number, number]) => ({ hotel: { id, lngLat } as Hotel });

describe("hotel map clusters", () => {
  const items = [
    item("a", [39.72, 43.58]),
    item("b", [39.72001, 43.58001]),
    item("c", [40.72, 43.58]),
  ];
  it("groups nearby hotels and preserves every hotel exactly once", () => {
    const groups = clusterHotels(items, 10);
    expect(groups).toHaveLength(2);
    expect(groups.flatMap((group) => group.items.map((entry) => entry.hotel.id)).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
  it("keeps the hovered hotel available as a separate marker", () => {
    expect(clusterHotels(items, 10, "a").find((group) => group.key === "a")?.items).toHaveLength(1);
    expect(clusterHotels(items, 15)).toHaveLength(3);
  });
});
