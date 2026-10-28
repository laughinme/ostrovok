import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useComparison } from "@/features/compare-hotels";
import { demoHotels } from "../src/app/demo/fixtures";
import { demoResponse } from "../src/app/demo/transport";

const clients: QueryClient[] = [];
const criteria = ["quiet", "sea"] as const;

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected network request")));
});
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
  vi.unstubAllGlobals();
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  client.setQueryData(["hotels", "catalog"], demoHotels);
  return client;
}

function readComparison(client: QueryClient, ids: string[]) {
  let result: ReturnType<typeof useComparison> | undefined;
  function Probe() {
    result = useComparison(ids, [...criteria]);
    return null;
  }
  renderToString(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );
  if (!result) throw new Error("Comparison did not render");
  return result;
}

describe("comparison selection", () => {
  it.each([[], [demoHotels[0]!.id]])(
    "does not compare or load catalogue suggestions for selection %j",
    async (...ids) => {
      const client = setup();
      const result = readComparison(client, ids);
      expect(result.scored).toEqual([]);
      expect(result.pending).toBe(false);
      expect(result.error).toBeNull();
      const observers = client
        .getQueryCache()
        .getAll()
        .map((query) => new QueryObserver(client, { ...query.options, queryKey: query.queryKey }));
      const unsubscribe = observers.map((observer) => observer.subscribe(() => {}));
      try {
        result.retry();
        await Promise.resolve();
        expect(fetch).not.toHaveBeenCalled();
      } finally {
        unsubscribe.forEach((stop) => stop());
      }
    },
  );

  it("does not show a loading state for an empty selection without a cached catalogue", () => {
    const client = setup();
    client.clear();
    expect(readComparison(client, [])).toMatchObject({ scored: [], pending: false, error: null });
  });

  it("only displays selected hotels even if the response contains another hotel", () => {
    const client = setup();
    const ids = demoHotels.slice(0, 2).map((hotel) => hotel.id);
    const response = demoResponse("/compare", {
      method: "POST",
      body: { selections: demoHotels.slice(0, 3).map((hotel) => ({ hotelId: hotel.id })) },
    });
    client.setQueryData(["comparison", ids, [...criteria]], response);
    const result = readComparison(client, ids);
    expect(result.pending).toBe(false);
    expect(result.scored.map(({ h }) => h.id).sort()).toEqual([...ids].sort());
    expect(readComparison(client, [ids[0]!]).scored).toEqual([]);
    expect(readComparison(client, []).scored).toEqual([]);
  });
});
