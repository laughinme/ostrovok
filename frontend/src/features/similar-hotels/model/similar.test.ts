import { describe, expect, it } from "vitest";
import { hotels, type Hotel, type ApiMatch } from "@/entities/hotel";
import { sharedReasons, similarQuery, similarRequest } from "./similar";

const chip = {
  id: "sea",
  characteristic: "sea_view",
  label: "Вид на море",
  importance: "must" as const,
  checkable: "compute" as const,
  fromProfile: false,
  params: { minFloor: 4 },
};
const source: Hotel = {
  ...hotels[0]!,
  searchContext: {
    id: "search-1",
    chips: [chip],
    trip: { from: "2026-11-10", to: "2026-11-15", adults: 2, children: 1, budgetPerNight: 9000 },
  },
};

describe("similar hotels", () => {
  it("preserves dates, guests, budget and the exact wish parameters", () => {
    expect(similarRequest(source, "quieter")).toEqual({
      change: "quieter",
      chips: [chip],
      trip: source.searchContext!.trip,
    });
  });

  it("can start without a search and only fetches after a modifier is selected", () => {
    expect(similarRequest(hotels[0]!, "cheaper")).toEqual({ change: "cheaper", chips: [] });
    expect(similarQuery(source, null).enabled).toBe(false);
    expect(similarQuery(source, "cheaper").enabled).toBe(true);
  });

  it("isolates cached results by hotel, modifier and travel context", () => {
    const key = similarQuery(source, "quieter").queryKey;
    expect(similarQuery(source, "cheaper").queryKey).not.toEqual(key);
    expect(similarQuery({ ...source, id: "another" }, "quieter").queryKey).not.toEqual(key);
    expect(similarQuery(hotels[0]!, "quieter").queryKey).not.toEqual(key);
  });

  it("only calls known facts a shared trait and prioritizes traits of the source hotel", () => {
    const result = (chipId: string, verdict: "yes" | "unknown", factId: string | null) => ({
      chipId,
      verdict,
      factId,
      line: chipId,
      probability: verdict === "yes" ? 0.9 : null,
    });
    const match = {
      perChip: [
        result("improve", "yes", "noise"),
        result("wish", "yes", "wish"),
        result("unknown", "unknown", null),
        result("missing", "yes", null),
        result("like:sea_view", "yes", "sea"),
      ],
    } as ApiMatch;
    expect(sharedReasons(match).map((reason) => reason.factId)).toEqual(["sea", "wish"]);
  });
});
