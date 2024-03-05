import { describe, it, expect } from "vitest";
import { randomElement } from "@utils/helpers";

describe("randomElement", () => {
  it("should return a random element from the array", () => {
    const elements = [1, 2, 3, 4, 5];
    const result = randomElement(elements);
    expect(elements).toContain(result);
  });

  it("should return undefined if the array is empty", () => {
    const elements: any[] = [];
    const result = randomElement(elements);
    expect(result).toBeUndefined();
  });
});
