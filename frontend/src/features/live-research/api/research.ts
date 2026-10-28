import { api, type components } from "@/shared/api";

export type SearchResult = components["schemas"]["SearchResultOut"];
type WishStarted = components["schemas"]["WishStarted"];
type RunStarted = components["schemas"]["RunStarted"];

export function addWish(searchId: string, text: string): Promise<WishStarted> {
  return api<WishStarted>(`/searches/${encodeURIComponent(searchId)}/wishes`, {
    method: "POST",
    body: { text },
  });
}

export function researchChip(searchId: string, chipId: string): Promise<RunStarted> {
  return api<RunStarted>(`/searches/${encodeURIComponent(searchId)}/research`, {
    method: "POST",
    body: { chipId },
  });
}

export async function askHotel(
  hotelId: string,
  characteristic: string,
  searchId: string | undefined,
  question: string,
): Promise<RunStarted> {
  const sid =
    searchId ??
    (await api<SearchResult>("/searches", { method: "POST", body: { text: question } })).searchId;
  return api<RunStarted>(`/searches/${encodeURIComponent(sid)}/research`, {
    method: "POST",
    body: { characteristic, hotelIds: [hotelId] },
  });
}

export function readSearch(searchId: string, signal?: AbortSignal): Promise<SearchResult> {
  return api<SearchResult>(`/searches/${encodeURIComponent(searchId)}`, {
    ...(signal ? { signal } : {}),
  });
}
