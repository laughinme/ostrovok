import { beforeEach, describe, expect, it } from "vitest";
import { useCompare } from "./store";
describe("hotel comparison", () => {
  beforeEach(() => useCompare.getState().clear());
  it("adds and removes a hotel", () => {
    useCompare.getState().toggle("first");
    expect(useCompare.getState().ids).toEqual(["first"]);
    useCompare.getState().toggle("first");
    expect(useCompare.getState().ids).toEqual([]);
  });
  it("keeps the three most recently selected hotels", () => {
    for (const id of ["first", "second", "third", "fourth"]) useCompare.getState().toggle(id);
    expect(useCompare.getState().ids).toEqual(["second", "third", "fourth"]);
  });
  it("clears the selection", () => {
    useCompare.getState().toggle("first");
    useCompare.getState().clear();
    expect(useCompare.getState().ids).toEqual([]);
  });
});
