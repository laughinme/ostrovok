import { describe, expect, it } from "vitest";
import { getRouter } from "@/app/router";
describe("application routes", () => {
  it.each(["/", "/search", "/results", "/compare", "/partner", "/hotel/gornyi-priyut"])(
    "matches %s",
    (path) => {
      const route = getRouter().matchRoutes(path).at(-1);
      expect(route?.routeId).toBe(path.startsWith("/hotel/") ? "/hotel/$id" : path);
    },
  );
  it("does not match an unknown page", () => {
    expect(getRouter().matchRoutes("/unknown").at(-1)?.routeId).toBe("__root__");
  });
});
