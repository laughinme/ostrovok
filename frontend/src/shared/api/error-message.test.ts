import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "./error-message";

describe("API errors", () => {
  it("explains rate limits and when to retry", () => {
    expect(apiErrorMessage(429, "Rate limited")).toContain("Подождите минуту");
  });
  it("does not stringify validation objects or expose server details", () => {
    expect(apiErrorMessage(422, [{ loc: ["text"], msg: "too long" }])).toContain("2000");
    expect(apiErrorMessage(500, "Database password is bad")).toContain("временно недоступен");
  });
  it("keeps actionable domain errors", () => {
    expect(apiErrorMessage(400, "Выберите номер")).toBe("Выберите номер");
  });
});
