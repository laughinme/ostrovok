import { describe, expect, it } from "vitest";
import { importViolation } from "../scripts/check-architecture.mjs";
import { findComments } from "../scripts/check-comments.mjs";

describe("FSD import boundaries", () => {
  it("allows lower layers through a public API", () => {
    expect(importViolation("widgets/card/ui/card.tsx", "@/entities/hotel")).toBeNull();
  });
  it("rejects imports from higher layers", () => {
    expect(
      importViolation("entities/hotel/model/types.ts", "@/features/hotel-search"),
    ).toBeTruthy();
  });
  it("rejects dependencies between sibling slices", () => {
    expect(
      importViolation("features/hotel-search/index.ts", "@/features/compare-hotels"),
    ).toBeTruthy();
  });
  it("rejects external access to slice internals", () => {
    expect(importViolation("pages/hotel/index.ts", "@/entities/hotel/model/types")).toBeTruthy();
  });
  it("checks relative imports too", () => {
    expect(
      importViolation("features/hotel-search/model/matching.ts", "../../../pages/home"),
    ).toBeTruthy();
  });
  it("allows internal relative imports", () => {
    expect(importViolation("entities/hotel/ui/price.tsx", "../model/types")).toBeNull();
  });
});

describe("source comments", () => {
  it("detects line, block and JSX comments", () => {
    const source = "// line\n/* block */\nconst element = <div>{/* jsx */}</div>;";
    expect(findComments("example.tsx", source)).toHaveLength(3);
  });
  it("does not confuse URLs and strings with comments", () => {
    expect(
      findComments("example.ts", 'const url = "https://example.com"; const text = "/* value */";'),
    ).toHaveLength(0);
  });
  it("detects CSS comments", () => {
    expect(findComments("example.css", "/* style */\nbody { color: red; }")).toHaveLength(1);
  });
});
