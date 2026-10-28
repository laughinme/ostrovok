import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { hotels } from "@/entities/hotel";
import { HotelResultCard } from "@/widgets/hotel-result-card";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

function card(criteria: ("quiet" | "sea")[]) {
  return renderToString(
    <HotelResultCard
      result={{ hotel: hotels[0]!, score: 50, best: [], weak: [] }}
      criteria={criteria}
      query="абракадабра"
      index={0}
      active={false}
      onHover={() => {}}
    />,
  );
}

describe("a search without recognized wishes", () => {
  it("shows facts without claiming a match or best offer", () => {
    const html = card([]);
    expect(html).toContain("Что известно об отеле");
    expect(html).not.toContain("совпадение");
    expect(html).not.toContain("Лучшее предложение");
  });
  it("shows a match when there are wishes", () => {
    expect(card(["quiet"])).toContain("совпадение");
  });
});
