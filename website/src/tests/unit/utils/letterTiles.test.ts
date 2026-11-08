import { toLetterTiles } from "@utils/letterTiles";
import { describe, expect, it } from "vitest";

const freq = { a: 6.51, e: 17.4, f: 1.66, l: 3.44, p: 0.97, ä: 0.54 };

describe("toLetterTiles", () => {
  it("marks umlauts and plain vowels, case-insensitive", () => {
    const tiles = toLetterTiles("Äpfel", freq);
    expect(tiles.map((t) => [t.ch, t.vowel])).toEqual([
      ["Ä", true],
      ["p", false],
      ["f", false],
      ["e", true],
      ["l", false],
    ]);
  });

  it("scales the fill to 0-100, the most frequent letter fills the tile", () => {
    const [ae, , , e] = toLetterTiles("Äpfel", freq);
    expect(e!.pct).toBe(97);
    expect(ae!.pct).toBe(8);
    expect(toLetterTiles("e", { e: 40 })[0]!.pct).toBe(100);
  });

  it("returns one tile per letter of a 36-character word", () => {
    expect(toLetterTiles("Rinnsteinschwalbenbeobachtungsposten", freq)).toHaveLength(36);
  });

  it("skips spaces, hyphens and other non-letters", () => {
    expect(toLetterTiles("Ab Notam-x 1", freq).map((t) => t.ch).join("")).toBe("AbNotamx");
  });

  it("gives a letter without a known frequency pct 0", () => {
    expect(toLetterTiles("q", freq)).toEqual([{ ch: "q", pct: 0, vowel: false }]);
  });
});
