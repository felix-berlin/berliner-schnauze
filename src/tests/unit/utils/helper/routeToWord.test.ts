import { describe, it, expect } from "vitest";
import { routeToWord } from "@utils/helpers";

describe("routeToWord", () => {
  it("should return '/wort' when input is not a string", () => {
    const result = routeToWord(undefined);
    expect(result).toBe("/wort");
  });

  it("should return '/wort/word' when input is a string", () => {
    const result = routeToWord("test");
    expect(result).toBe("/wort/test");
  });
});
