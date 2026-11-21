import { describe, expect, it } from "vitest";

import {
  ageGroup,
  agePercents,
  districtValue,
  MIN_GROUP,
  MORSE_MAX_MARKS,
  morseRing,
  typicalWord,
  type AgeGroup,
  type UsageCounts,
} from "../src/lib/homeStats";

describe("morseRing", () => {
  it("counts the marks of the word", () => {
    expect(morseRing("KIEZ")).toHaveLength(10);
    expect(morseRing("SCHRIPPE")).toHaveLength(25);
  });

  it("maps dot to d and dash to l", () => {
    // K -.-  I ..  E .  Z --..
    expect(morseRing("KIEZ").map((m) => m.sym)).toEqual([
      "l",
      "d",
      "l",
      "d",
      "d",
      "d",
      "l",
      "l",
      "d",
      "d",
    ]);
  });

  it("places the first mark like the SPEC formula", () => {
    // E = one dot: total t = 1 + 0.9, first unit at 0.5, angle -90 + 360 * 0.5 / 1.9
    expect(morseRing("E")).toEqual([
      { sym: "d", left: "94.846%", top: "53.716%", rotate: "94.737deg" },
    ]);
  });

  it("handles umlauts and ß", () => {
    expect(morseRing("Äh")).toHaveLength(8);
    expect(morseRing("ß")).toHaveLength(7);
  });

  it("skips characters outside the table", () => {
    expect(morseRing("-’")).toEqual([]);
    expect(morseRing("")).toEqual([]);
    expect(morseRing("a b-c")).toEqual(morseRing("abc"));
  });

  it("caps at whole letters from the start of the word", () => {
    // K O D D E R S C H = 27 marks, N would make 29
    expect(morseRing("Kodderschnauze")).toHaveLength(27);
    expect(morseRing("Kodderschnauze").length).toBeLessThanOrEqual(MORSE_MAX_MARKS);
  });
});

describe("ageGroup", () => {
  it("merges the eight ages into four groups", () => {
    expect(
      (["u20", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80plus"] as const).map(
        ageGroup,
      ),
    ).toEqual(["u30", "u30", "30-49", "30-49", "50-69", "50-69", "70plus", "70plus"]);
  });
});

describe("districtValue", () => {
  it("is null below MIN_GROUP and the rounded say share from MIN_GROUP", () => {
    expect(MIN_GROUP).toBe(10);
    expect(districtValue({ say: 4, know: 3, never: 2 })).toBeNull();
    expect(districtValue({ say: 5, know: 3, never: 2 })).toBe(50);
    expect(districtValue({ say: 0, know: 0, never: 0 })).toBeNull();
    expect(districtValue({ say: 1, know: 2, never: 7 })).toBe(10);
    expect(districtValue({ say: 2, know: 0, never: 9 })).toBe(18);
  });
});

describe("agePercents", () => {
  it("nulls groups below MIN_GROUP", () => {
    const c = (say: number, know: number, never: number): UsageCounts => ({ say, know, never });
    const by: Record<AgeGroup, UsageCounts> = {
      u30: c(1, 1, 1),
      "30-49": c(5, 3, 2),
      "50-69": c(10, 0, 0),
      "70plus": c(0, 0, 0),
    };
    expect(agePercents(by)).toEqual({ u30: null, "30-49": 50, "50-69": 100, "70plus": null });
  });
});

describe("typicalWord", () => {
  it("ignores words below MIN_GROUP and picks the largest gap above the word's own Berlin share", () => {
    const words = [
      { word: 1, say: 5, total: 10, citySay: 0.2 }, // +0.3
      { word: 2, say: 9, total: 10, citySay: 0.8 }, // +0.1
      { word: 3, say: 3, total: 3, citySay: 0 }, // +1.0 but too few votes
    ];
    expect(typicalWord(words)).toBe(1);
  });

  it("does not pick the most-said word when its Berlin share is just as high", () => {
    const words = [
      { word: 1, say: 9, total: 10, citySay: 0.9 }, // most said, but +0
      { word: 2, say: 4, total: 10, citySay: 0.2 }, // +0.2
    ];
    expect(typicalWord(words)).toBe(2);
  });

  it("breaks ties by the lower word id", () => {
    const words = [
      { word: 7, say: 6, total: 10, citySay: 0.4 },
      { word: 3, say: 6, total: 10, citySay: 0.4 },
    ];
    expect(typicalWord(words)).toBe(3);
  });

  it("never picks a word that only sits at its Berlin share (one district only)", () => {
    // a word with enough votes in one district only has that district's share as its Berlin share: gap 0
    expect(typicalWord([{ word: 1, say: 9, total: 10, citySay: 0.9 }])).toBeNull();
  });

  it("returns null when every word is below its Berlin share", () => {
    const words = [
      { word: 1, say: 5, total: 10, citySay: 0.6 },
      { word: 2, say: 2, total: 10, citySay: 0.3 },
    ];
    expect(typicalWord(words)).toBeNull();
  });

  it("lets a positive gap win over zero and negative ones", () => {
    const words = [
      { word: 1, say: 9, total: 10, citySay: 0.9 }, // 0
      { word: 2, say: 3, total: 10, citySay: 0.5 }, // -0.2
      { word: 3, say: 5, total: 10, citySay: 0.45 }, // +0.05
    ];
    expect(typicalWord(words)).toBe(3);
  });

  it("returns null for an empty list or when nothing has enough votes", () => {
    expect(typicalWord([])).toBeNull();
    expect(typicalWord([{ word: 1, say: 3, total: 3, citySay: 0.1 }])).toBeNull();
  });
});
