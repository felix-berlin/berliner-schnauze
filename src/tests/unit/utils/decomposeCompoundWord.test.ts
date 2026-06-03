import { decomposeCompoundWord } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";

const dict = new Set(["bier", "pinsel", "hoden", "kobold", "schnauze", "berlin", "arbeit", "platz"]);

describe("decomposeCompoundWord", () => {
  it("splits a compound word at the correct boundary", () => {
    expect(decomposeCompoundWord("Bierpinsel", dict)).toEqual(["bier", "pinsel"]);
  });

  it("splits Hodenkobold correctly (hoden + kobold, no Fugen-s needed)", () => {
    // "hodenkobold" splits as hoden + kobold (no fugen-s needed here)
    expect(decomposeCompoundWord("Hodenkobold", dict)).toEqual(["hoden", "kobold"]);
  });

  it("handles actual Fugen-s (Arbeitsplatz → arbeit + platz)", () => {
    // "arbeitsplatz" splits as arbeit + s + platz, where the 's' is recognized and removed
    expect(decomposeCompoundWord("Arbeitsplatz", dict)).toEqual(["arbeit", "platz"]);
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
