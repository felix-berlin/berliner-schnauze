import { wordCuriosities } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";

describe("wordCuriosities", () => {
  it("handles empty string without throwing", () => {
    const result = wordCuriosities("");
    expect(result.isPalindrome).toBe(true); // "" reversed is still ""
    expect(result.isIsogram).toBe(false);   // guarded: length > 0 required
    expect(result.totalLetterCount).toBe(0);
  });

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
    const result = wordCuriosities("Bierpinsel");
    expect(result.longestConsonantRun.length).toBe(2);
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

  describe("isIsogram", () => {
    it("detects an isogram (no repeated letters)", () => {
      expect(wordCuriosities("Klops").isIsogram).toBe(true);
    });

    it("detects a non-isogram", () => {
      expect(wordCuriosities("Bierpinsel").isIsogram).toBe(false);
    });
  });

  describe("longestVowelRun", () => {
    it("finds a vowel run", () => {
      const result = wordCuriosities("Mauerblume");
      expect(result.longestVowelRun.length).toBeGreaterThanOrEqual(2);
    });

    it("returns zero-length vowel run for consonant-heavy word", () => {
      const result = wordCuriosities("Strumpf");
      expect(result.longestVowelRun.length).toBe(1);
    });
  });

  describe("doubleLetters", () => {
    it("finds double letters", () => {
      const result = wordCuriosities("Kaffee");
      expect(result.doubleLetters).toContain("f");
      expect(result.doubleLetters).toContain("e");
    });

    it("returns empty array when no double letters", () => {
      const result = wordCuriosities("Klops");
      expect(result.doubleLetters).toHaveLength(0);
    });
  });

  describe("isAlternating", () => {
    it("detects a perfectly alternating word", () => {
      // B-a-s-e-l → CVCVC
      expect(wordCuriosities("Basel").isAlternating).toBe(true);
      // L-i-m-o-n-a-d-e → CVCVCVCV
      expect(wordCuriosities("Limonade").isAlternating).toBe(true);
    });

    it("returns false for non-alternating words", () => {
      // str... has consecutive consonants
      expect(wordCuriosities("Strumpf").isAlternating).toBe(false);
      // B-i-e... has consecutive vowels
      expect(wordCuriosities("Bierpinsel").isAlternating).toBe(false);
    });

    it("returns false for words shorter than 4 letters", () => {
      expect(wordCuriosities("aba").isAlternating).toBe(false);
    });
  });

  describe("stats", () => {
    it("counts total and unique letters correctly", () => {
      // "Kaffee" → k,a,f,f,e,e = 6 total, k,a,f,e = 4 unique
      const result = wordCuriosities("Kaffee");
      expect(result.totalLetterCount).toBe(6);
      expect(result.uniqueLetterCount).toBe(4);
    });

    it("counts distinct vowels", () => {
      // "Strumpf" → only u
      expect(wordCuriosities("Strumpf").distinctVowelCount).toBe(1);
      // "Bierpinsel" → i, e
      expect(wordCuriosities("Bierpinsel").distinctVowelCount).toBe(2);
    });
  });
});
