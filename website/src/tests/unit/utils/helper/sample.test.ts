import { sample } from "@utils/helpers.ts";
import { describe, expect, it } from "vitest";

describe("sample", () => {
  const arr = Array.from({ length: 50 }, (_, i) => i);

  it("picks k distinct items of the array", () => {
    for (let run = 0; run < 100; run++) {
      const picked = sample(arr, 7);
      expect(picked).toHaveLength(7);
      expect(new Set(picked).size).toBe(7);
      for (const item of picked) expect(arr).toContain(item);
    }
  });

  it("returns every item when k exceeds the length, and nothing for an empty array", () => {
    expect(sample([1, 2, 3], 7).toSorted()).toEqual([1, 2, 3]);
    expect(sample([], 7)).toEqual([]);
  });

  it("reaches every item (uniform over runs)", () => {
    const seen = new Set<number>();
    for (let run = 0; run < 500; run++) for (const item of sample(arr, 3)) seen.add(item);
    expect(seen.size).toBe(arr.length);
  });
});
