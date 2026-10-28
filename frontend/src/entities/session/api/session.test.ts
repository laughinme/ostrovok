import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, getApiMode } from "@/shared/api";
import { useSession } from "../model/session";
import { restoreSession, sessionApi, signIn, signOut } from "./session";
import { demoApi } from "./demo-session";

vi.mock("@/shared/api", async (original) => {
  const actual = await original<typeof import("@/shared/api")>();
  return { ...actual, api: vi.fn(), getApiMode: vi.fn(() => "live") };
});

const account = {
  id: "private-guest",
  email: "guest@example.test",
  username: "Гость",
  role: "guest",
  persona: null,
};
const tokens = { access_token: "test-access", expires_in: 3600, token_type: "bearer" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", { cookie: "" });
  vi.mocked(getApiMode).mockReturnValue("live");
  useSession.setState({ account: null, token: null, ready: false, expiresAt: 0, dialog: false });
});

describe("account isolation", () => {
  it("does not silently sign an anonymous visitor into a shared persona", async () => {
    await expect(demoApi("guest_anna", "/me/trips")).rejects.toMatchObject({
      status: 401,
      code: "SIGN_IN_REQUIRED",
    });
    expect(api).not.toHaveBeenCalled();
    expect(useSession.getState().dialog).toBe(true);
  });
  it("uses the selected private account even through legacy callers", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce(tokens)
      .mockResolvedValueOnce(account)
      .mockResolvedValueOnce([]);
    await signIn("guest@example.test", "test-password");
    await demoApi("guest_anna", "/me/trips");
    expect(api).toHaveBeenLastCalledWith("/me/trips", { method: "GET", token: "test-access" });
    expect(vi.mocked(api).mock.calls.some(([path]) => path === "/auth/demo")).toBe(false);
  });
  it("restores one shared refresh request and echoes the CSRF cookie", async () => {
    vi.stubGlobal("document", { cookie: "csrf_token=test-csrf" });
    vi.mocked(api).mockResolvedValueOnce(tokens).mockResolvedValueOnce(account);
    await Promise.all([restoreSession(), restoreSession()]);
    expect(api).toHaveBeenCalledTimes(2);
    expect(api).toHaveBeenCalledWith("/auth/refresh", {
      method: "POST",
      headers: { "X-CSRF-Token": "test-csrf", "X-Client": "web" },
    });
    expect(useSession.getState().account?.id).toBe("private-guest");
  });
  it("does not replace an expired account with a demo persona", async () => {
    vi.stubGlobal("document", { cookie: "csrf_token=test-csrf" });
    vi.mocked(api).mockRejectedValueOnce(new ApiError(401, "Expired"));
    await expect(sessionApi("/bookings", { method: "POST" })).rejects.toMatchObject({
      status: 401,
    });
    expect(useSession.getState().account).toBeNull();
    expect(vi.mocked(api).mock.calls).toHaveLength(1);
  });
  it("keeps local demo requests inside the demo transport", async () => {
    vi.mocked(getApiMode).mockReturnValue("demo");
    vi.mocked(api).mockResolvedValueOnce([]);
    await sessionApi("/me/trips");
    expect(api).toHaveBeenCalledExactlyOnceWith("/me/trips", {});
  });
  it("clears the account only after the server accepted logout", async () => {
    useSession.setState({ account: account as never, token: "test-access" });
    vi.mocked(api).mockRejectedValueOnce(new Error("Offline"));
    await expect(signOut()).rejects.toThrow("Offline");
    expect(useSession.getState().account?.id).toBe("private-guest");
    vi.mocked(api).mockResolvedValueOnce(undefined);
    await signOut();
    expect(useSession.getState().token).toBeNull();
  });
});
