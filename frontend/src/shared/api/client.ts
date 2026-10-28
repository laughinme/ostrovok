export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (getApiMode() === "demo") {
    const transport = getDemoTransport();
    if (!transport) throw new ApiError(503, "Демо-режим ещё не готов. Обновите страницу.");
    return (await transport(path, options)) as T;
  }
  const origin = import.meta.env.SSR
    ? (process.env["BACKEND_URL"] ?? "https://okno-api.fly.dev")
    : "";
  const headers = new Headers({ Accept: "application/json", ...options.headers });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(60000)])
    : AbortSignal.timeout(60000);
  const response = await fetch(`${origin}/api/v1${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    signal,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = body as { detail?: unknown; error_code?: string } | null;
    throw new ApiError(
      response.status,
      typeof problem?.detail === "string"
        ? problem.detail
        : response.status === 422
          ? "Проверьте заполненные поля и выбранные условия."
          : `Сервис вернул ошибку ${response.status}`,
      problem?.error_code,
    );
  }
  if (body === null) throw new ApiError(502, "Сервис вернул некорректный ответ");
  return body as T;
}
import { getApiMode } from "./execution-mode";
import { getDemoTransport, type ApiOptions } from "./demo-transport";
