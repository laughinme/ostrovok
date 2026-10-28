import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";
import { registerDemoTransport } from "./demo-transport";
import { getApiMode } from "./execution-mode";

vi.mock("./execution-mode", () => ({ getApiMode: vi.fn(() => "live") }));
afterEach(() => {
  vi.unstubAllGlobals();
  registerDemoTransport(undefined);
  vi.mocked(getApiMode).mockReturnValue("live");
});

describe("API errors and mode separation", () => {
  it("keeps validation errors readable when FastAPI returns a detail array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ detail: [{ msg: "Invalid" }] }), { status: 422 }),
      ),
    );
    await expect(api("/searches")).rejects.toMatchObject({
      status: 422,
      message: "Проверьте запрос: от 1 до 2000 символов, корректные даты и число гостей.",
    });
  });
  it("keeps non-search validation messages about form fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ detail: [{ msg: "Invalid" }] }), { status: 422 }),
      ),
    );
    await expect(api("/bookings")).rejects.toMatchObject({
      status: 422,
      message: "Проверьте заполненные поля и выбранные условия.",
    });
  });
  it("never substitutes demo data when the live API fails", async () => {
    const demo = vi.fn(async () => [{ id: "fake" }]);
    registerDemoTransport(demo);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ detail: "Недоступно" }), { status: 503 })),
    );
    await expect(api("/hotels")).rejects.toMatchObject({
      status: 503,
      message: "Сервис временно недоступен. Попробуйте ещё раз через минуту.",
    });
    expect(demo).not.toHaveBeenCalled();
  });
  it("never sends a live request in demo mode, including unsupported operations", async () => {
    vi.mocked(getApiMode).mockReturnValue("demo");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    registerDemoTransport(async () => {
      throw new Error("Unsupported demo action");
    });
    await expect(api("/console/runs")).rejects.toThrow("Unsupported demo action");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
