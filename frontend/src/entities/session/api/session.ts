import { api, ApiError, getApiMode, type ApiOptions, type components } from "@/shared/api";
import { useSession, type Account } from "../model/session";

type Tokens = components["schemas"]["TokenPair"];
let refreshing: Promise<string | null> | undefined;

function csrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = document.cookie
    .split(";")
    .find((cookie) => cookie.trim().startsWith("csrf_token="));
  return value ? decodeURIComponent(value.trim().slice("csrf_token=".length)) : undefined;
}

async function accept(tokens: Tokens): Promise<string> {
  const account = await api<Account>("/me", { token: tokens.access_token });
  useSession.setState({
    account,
    token: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    ready: true,
    dialog: false,
  });
  return tokens.access_token;
}

export async function restoreSession(): Promise<string | null> {
  if (getApiMode() === "demo" || typeof window === "undefined") return null;
  if (refreshing) return refreshing;
  const csrf = csrfToken();
  if (!csrf) {
    useSession.setState({ account: null, token: null, expiresAt: 0, ready: true });
    return null;
  }
  refreshing = api<Tokens>("/auth/refresh", {
    method: "POST",
    headers: { "X-CSRF-Token": csrf, "X-Client": "web" },
  })
    .then(accept)
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        useSession.setState({ account: null, token: null, expiresAt: 0, ready: true });
        return null;
      }
      useSession.setState({ ready: true });
      throw error;
    })
    .finally(() => {
      refreshing = undefined;
    });
  return refreshing;
}

export async function signIn(email: string, password: string) {
  return accept(await api<Tokens>("/auth/login", { method: "POST", body: { email, password } }));
}

export async function signUp(email: string, password: string, username: string) {
  return accept(
    await api<Tokens>("/auth/register", {
      method: "POST",
      body: { email, password, ...(username.trim() ? { username: username.trim() } : {}) },
    }),
  );
}

export async function signInPersona(persona: string) {
  return accept(await api<Tokens>("/auth/demo", { method: "POST", body: { persona } }));
}

export async function signOut() {
  await api<void>("/auth/logout", { method: "POST" });
  useSession.setState({ account: null, token: null, expiresAt: 0, ready: true });
}

export async function sessionApi<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (getApiMode() === "demo") return api<T>(path, options);
  let { token } = useSession.getState();
  const { expiresAt } = useSession.getState();
  if (!token || expiresAt < Date.now() + 30000) token = await restoreSession();
  if (!token) {
    useSession.getState().open();
    throw new ApiError(401, "Войдите в свой аккаунт, чтобы продолжить.", "SIGN_IN_REQUIRED");
  }
  try {
    return await api<T>(path, { ...options, token });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const next = await restoreSession();
    if (!next) {
      useSession.getState().open();
      throw new ApiError(401, "Сессия закончилась. Войдите ещё раз.", "SIGN_IN_REQUIRED");
    }
    return api<T>(path, { ...options, token: next });
  }
}
