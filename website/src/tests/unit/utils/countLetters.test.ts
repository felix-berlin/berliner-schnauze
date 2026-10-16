import { countLetters } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";

describe("countLetters", () => {
  it("should correctly count vowels and consonants in a word", () => {
    const result = countLetters("Hello");
    expect(result).toEqual({ consonants: 3, vowels: 2 });
  });

  it("should correctly count vowels and consonants in a word with special characters", () => {
    const result = countLetters("Hällö");
    expect(result).toEqual({ consonants: 3, vowels: 2 });
  });

  it("should return zero counts for an empty string", () => {
    const result = countLetters("");
    expect(result).toEqual({ consonants: 0, vowels: 0 });
  });

  it("should ignore non-alphabet characters", () => {
    const result = countLetters("Hello, World!");
    expect(result).toEqual({ consonants: 7, vowels: 3 });
  });
});
