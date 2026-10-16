import { letterFrequency } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";

describe("letterFrequency", () => {
  it("returns one entry per unique letter in the word", () => {
    const result = letterFrequency("aal");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.char)).toEqual(expect.arrayContaining(["a", "l"]));
  });

  it("marks vowels correctly", () => {
    const result = letterFrequency("Bier");
    const b = result.find((r) => r.char === "b");
    const i = result.find((r) => r.char === "i");
    expect(b?.isVowel).toBe(false);
    expect(i?.isVowel).toBe(true);
  });

  it("assigns 'sehr häufig' label for e", () => {
    const result = letterFrequency("e");
    expect(result[0]?.label).toBe("sehr häufig");
  });

  it("assigns 'sehr selten' label for x", () => {
    const result = letterFrequency("x");
    expect(result[0]?.label).toBe("sehr selten");
  });

  it("skips unknown characters (numbers, spaces)", () => {
    const result = letterFrequency("abc 1");
    expect(result.every((r) => r.char !== " " && r.char !== "1")).toBe(true);
  });

  it("returns empty array for empty string", () => {
    expect(letterFrequency("")).toHaveLength(0);
  });

  it("handles uppercase input", () => {
    const result = letterFrequency("BIER");
    expect(result.map((r) => r.char)).toEqual(expect.arrayContaining(["b", "i", "e", "r"]));
  });
});
