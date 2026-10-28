import { api, ApiError, type components } from "@/shared/api";

type Session = components["schemas"]["TokenPair"];
const sessions = new Map<string, { token: string; expiresAt: number }>();
const pending = new Map<string, Promise<string>>();

export function getDemoSession(persona: string): Promise<string> {
  const current = sessions.get(persona);
  if (current && current.expiresAt > Date.now() + 30000) return Promise.resolve(current.token);
  const existing = pending.get(persona);
  if (existing) return existing;
  const request = api<Session>("/auth/demo", { method: "POST", body: { persona } })
    .then((session) => {
      sessions.set(persona, {
        token: session.access_token,
        expiresAt: Date.now() + session.expires_in * 1000,
      });
      return session.access_token;
    })
    .finally(() => pending.delete(persona));
  pending.set(persona, request);
  return request;
}

export async function demoApi<T>(
  persona: string,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const token = await getDemoSession(persona);
  try {
    return await api<T>(path, { method, token, ...(body !== undefined ? { body } : {}) });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    sessions.delete(persona);
    const nextToken = await getDemoSession(persona);
    return api<T>(path, { method, token: nextToken, ...(body !== undefined ? { body } : {}) });
  }
}
