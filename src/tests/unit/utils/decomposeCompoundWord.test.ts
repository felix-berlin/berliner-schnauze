import { decomposeCompoundWord } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";

const dict = new Set(["bier", "pinsel", "hoden", "kobold", "schnauze", "berlin"]);

describe("decomposeCompoundWord", () => {
  it("splits a compound word at the correct boundary", () => {
    expect(decomposeCompoundWord("Bierpinsel", dict)).toEqual(["bier", "pinsel"]);
  });

  it("handles Fugen-s (Hodenkobold → hoden + kobold)", () => {
    // "hodenkobold" splits as hoden + kobold (no fugen-s needed here)
    expect(decomposeCompoundWord("Hodenkobold", dict)).toEqual(["hoden", "kobold"]);
  });

  it("returns null for a word that is itself in the dictionary", () => {
    expect(decomposeCompoundWord("Berlin", dict)).toBeNull();
  });

  it("returns null for words shorter than 5 characters", () => {
    expect(decomposeCompoundWord("Bier", dict)).toBeNull();
  });

  it("returns null when no valid split is found", () => {
    const smallDict = new Set(["abc"]);
    expect(decomposeCompoundWord("Schnauze", smallDict)).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(decomposeCompoundWord("BIERPINSEL", dict)).toEqual(["bier", "pinsel"]);
  });
});
