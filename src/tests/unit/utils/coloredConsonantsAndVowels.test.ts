import { describe, it, expect } from "vitest";
import { coloredConsonantsAndVowels } from "@utils/wordHelper";

describe("coloredConsonantsAndVowels", () => {
  it("should correctly color vowels and consonants", () => {
    const word = "Hello";
    const expectedOutput =
      '<span class="is-consonant">H</span><span class="is-vowel">e</span><span class="is-consonant">l</span><span class="is-consonant">l</span><span class="is-vowel">o</span>';
    expect(coloredConsonantsAndVowels(word)).toBe(expectedOutput);
  });

  it("should handle empty strings", () => {
    const word = "";
    const expectedOutput = "";
    expect(coloredConsonantsAndVowels(word)).toBe(expectedOutput);
  });

  it("should handle strings with only vowels", () => {
    const word = "aeiou";
    const expectedOutput =
      '<span class="is-vowel">a</span><span class="is-vowel">e</span><span class="is-vowel">i</span><span class="is-vowel">o</span><span class="is-vowel">u</span>';
    expect(coloredConsonantsAndVowels(word)).toBe(expectedOutput);
  });

  it("should handle strings with only consonants", () => {
    const word = "bcdfg";
    const expectedOutput =
      '<span class="is-consonant">b</span><span class="is-consonant">c</span><span class="is-consonant">d</span><span class="is-consonant">f</span><span class="is-consonant">g</span>';
    expect(coloredConsonantsAndVowels(word)).toBe(expectedOutput);
  });
});
