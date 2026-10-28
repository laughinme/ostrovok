import { describe, expect, it } from "vitest";
import { demoResponse } from "../src/app/demo/transport";
import type { components } from "../src/shared/api";

type Route = components["schemas"]["RouteOut"];
type Place = components["schemas"]["PlaceOut"];
const root = "/hotels/demo-palmovyi-sad";

describe("local hotel directions", () => {
  it("finds an existing nearby place and routes to its selected coordinate", () => {
    const places = demoResponse(`${root}/places?q=${encodeURIComponent("парк")}`, {}) as Place[];
    expect(places).toHaveLength(1);
    const place = places[0]!;
    const params = new URLSearchParams({
      lon: String(place.location[0]),
      lat: String(place.location[1]),
      name: place.name,
      profile: "stroller",
    });
    const route = demoResponse(`${root}/route?${params}`, {}) as Route;
    expect(route.geometry.coordinates.at(-1)).toEqual(place.location);
    expect(route.targetName).toBe(place.name);
    expect(route.there.lengthM).toBe(980);
    expect(route.there.minutes).toBeGreaterThanOrEqual(14);
    expect(route.estimated).toBe(true);
    expect(route.attribution).toContain("Демо");
    expect(route.caveats.join(" ")).toContain("не подходят");
  });
  it("keeps an empty address search empty instead of inventing a place", () => {
    expect(demoResponse(`${root}/places?q=missing-address`, {})).toEqual([]);
  });
  it("supports the transport shortcut in demo with an explicitly synthetic route", () => {
    const route = demoResponse(`${root}/routes/station?profile=walk`, {}) as Route;
    expect(route.targetName).toContain("Станция");
    expect(route.estimated).toBe(true);
  });
});
