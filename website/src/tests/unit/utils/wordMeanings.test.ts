import { splitMeanings } from "@utils/wordMeanings";
import { describe, expect, it } from "vitest";

const make = (n: number) => Array.from({ length: n }, (_, i) => `Bedeutung ${i + 1}`);

describe("splitMeanings", () => {
  it("keeps one meaning visible", () => {
    expect(splitMeanings(make(1))).toEqual({ hidden: [], visible: make(1) });
  });

  it("hides nothing at the limit of 5", () => {
    expect(splitMeanings(make(5)).hidden).toEqual([]);
  });

  it("shows 5 and hides the rest from 6 on", () => {
    const { hidden, visible } = splitMeanings(make(10));
    expect(visible).toEqual(make(10).slice(0, 5));
    expect(hidden).toEqual(make(10).slice(5));
    expect(splitMeanings(make(6)).hidden).toHaveLength(1);
  });

  it("honours a custom limit", () => {
    expect(splitMeanings(make(4), 2).hidden).toHaveLength(2);
  });
});
