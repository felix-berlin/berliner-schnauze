import { describe, it, expect } from "vitest";
import { countLetters } from "@utils/wordHelper";

describe("countLetters", () => {
  it("should correctly count vowels and consonants in a word", () => {
    const result = countLetters("Hello");
    expect(result).toEqual({ vowels: 2, consonants: 3 });
  });

  it("should correctly count vowels and consonants in a word with special characters", () => {
    const result = countLetters("Hällö");
    expect(result).toEqual({ vowels: 2, consonants: 3 });
  });

  it("should return zero counts for an empty string", () => {
    const result = countLetters("");
    expect(result).toEqual({ vowels: 0, consonants: 0 });
  });

  it("should ignore non-alphabet characters", () => {
    const result = countLetters("Hello, World!");
    expect(result).toEqual({ vowels: 3, consonants: 7 });
  });
});
