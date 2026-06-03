import { wordCuriosities } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";

describe("wordCuriosities", () => {
  it("detects a palindrome", () => {
    expect(wordCuriosities("anna").isPalindrome).toBe(true);
  });

  it("detects a non-palindrome", () => {
    expect(wordCuriosities("Bierpinsel").isPalindrome).toBe(false);
  });

  it("detects when all German vowels are present", () => {
    expect(wordCuriosities("aeiouäöü").hasAllVowels).toBe(true);
  });

  it("detects when not all German vowels are present", () => {
    expect(wordCuriosities("Bierpinsel").hasAllVowels).toBe(false);
  });

  it("finds the longest consonant run", () => {
    // B-i-e-r-p-i-n-s-e-l → "rp" is the first run of length 2
    const result = wordCuriosities("Bierpinsel");
    expect(result.longestConsonantRun.length).toBe(2);
    // use a word with an unambiguous 3-char run
    const result2 = wordCuriosities("Strumpf");
    expect(result2.longestConsonantRun.chars).toBe("str");
    expect(result2.longestConsonantRun.length).toBe(3);
  });

  it("detects start/end consonant correctly", () => {
    const result = wordCuriosities("Bierpinsel");
    expect(result.startsWithConsonant).toBe(true);
    expect(result.endsWithConsonant).toBe(true);
  });

  it("detects start vowel correctly", () => {
    const result = wordCuriosities("aasen");
    expect(result.startsWithConsonant).toBe(false);
    expect(result.endsWithConsonant).toBe(true);
  });

  it("returns zero-length consonant run for all-vowel word", () => {
    const result = wordCuriosities("aeiou");
    expect(result.longestConsonantRun.length).toBe(0);
  });
});
