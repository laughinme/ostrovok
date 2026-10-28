export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`API request failed (${status})`);
    this.name = 'ApiError';
  }
}

/** Base URL is public configuration, never a place for secrets. */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '/api').replace(/\/$/, '');
  const response = await fetch(`${base}${path}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}
