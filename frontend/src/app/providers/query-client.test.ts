import { QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppQueryClient } from "./query-client";

const clients: ReturnType<typeof createAppQueryClient>[] = [];
function createClient() {
  const client = createAppQueryClient(false);
  clients.push(client);
  return client;
}
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
  vi.useRealTimers();
});

describe("navigation query cache", () => {
  it("reuses fresh results across consumers and deduplicates concurrent requests", async () => {
    const client = createClient();
    const queryFn = vi.fn(async () => [{ id: "hotel", price: 10000 }]);
    const query = { queryKey: ["hotels", "catalog"], queryFn };
    const [first, second] = await Promise.all([client.fetchQuery(query), client.fetchQuery(query)]);
    expect(first).toBe(second);
    expect(await client.fetchQuery(query)).toBe(first);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("keeps stale data usable during refresh and after a failed background request", async () => {
    const client = createClient();
    const queryKey = ["hotels", "catalog"];
    client.setQueryData(queryKey, [{ id: "hotel", price: 10000 }], {
      updatedAt: Date.now() - 6 * 60 * 1000,
    });
    let fail: (reason: Error) => void = () => {};
    const observer = new QueryObserver(client, {
      queryKey,
      queryFn: () => new Promise<{ id: string; price: number }[]>((_, reject) => (fail = reject)),
      retry: false,
    });
    const unsubscribe = observer.subscribe(() => {});
    try {
      expect(observer.getCurrentResult()).toMatchObject({
        data: [{ id: "hotel", price: 10000 }],
        isPending: false,
        isFetching: true,
      });
      const refresh = observer.refetch();
      fail(new Error("offline"));
      expect(await refresh).toMatchObject({
        data: [{ id: "hotel", price: 10000 }],
        isPending: false,
        isRefetchError: true,
      });
    } finally {
      unsubscribe();
    }
  });

  it("retains inactive pages for half an hour instead of discarding them after five minutes", async () => {
    vi.useFakeTimers();
    const client = createClient();
    const queryKey = ["comparison", "selected-hotels"];
    await client.fetchQuery({ queryKey, queryFn: async () => "saved-result" });
    await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
    expect(client.getQueryData(queryKey)).toBe("saved-result");
    await vi.advanceTimersByTimeAsync(25 * 60 * 1000);
    expect(client.getQueryData(queryKey)).toBeUndefined();
  });

  it("keeps independent application instances isolated", () => {
    const first = createClient();
    const second = createClient();
    first.setQueryData(["partner"], "private-data");
    expect(second.getQueryData(["partner"])).toBeUndefined();
  });
});
