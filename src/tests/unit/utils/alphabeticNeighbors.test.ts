import { alphabeticNeighbors } from "@utils/wordHelper";
import { describe, it, expect } from "vitest";
import type { BerlinerWord } from "@/gql/entity-types";

const makeWord = (berlinerisch: string, id: string): BerlinerWord =>
  ({
    id,
    slug: berlinerisch.toLowerCase(),
    wordProperties: { berlinerisch },
  }) as unknown as BerlinerWord;

describe("alphabeticNeighbors", () => {
  const allWords = [
    makeWord("Anton", "1"),
    makeWord("Berta", "2"),
    makeWord("Caesar", "3"),
    makeWord("Dora", "4"),
    makeWord("Emil", "5"),
  ];

  it("returns correct neighbors for a middle word", () => {
    const current = allWords[2]!;
    const { before, after } = alphabeticNeighbors(allWords, current, 2);
    expect(before.map((w) => w.wordProperties?.berlinerisch)).toEqual(["Berta", "Anton"]);
    expect(after.map((w) => w.wordProperties?.berlinerisch)).toEqual(["Dora", "Emil"]);
  });

  it("returns fewer results at the start of the list", () => {
    const current = allWords[0]!;
    const { before, after } = alphabeticNeighbors(allWords, current, 3);
    expect(before).toHaveLength(0);
    expect(after.map((w) => w.wordProperties?.berlinerisch)).toEqual(["Berta", "Caesar", "Dora"]);
  });

  it("returns fewer results at the end of the list", () => {
    const current = allWords[4]!;
    const { before, after } = alphabeticNeighbors(allWords, current, 3);
    expect(before.map((w) => w.wordProperties?.berlinerisch)).toEqual(["Dora", "Caesar", "Berta"]);
    expect(after).toHaveLength(0);
  });

  it("returns empty for unknown word", () => {
    const unknown = makeWord("Zorro", "99");
    const { before, after } = alphabeticNeighbors(allWords, unknown, 3);
    expect(before).toHaveLength(0);
    expect(after).toHaveLength(0);
  });

  it("sorts umlauts correctly under German locale (ä after a, before b)", () => {
    const umlautWords = [
      makeWord("Affe", "1"),
      makeWord("Äpfel", "2"),
      makeWord("Birne", "3"),
    ];
    const current = umlautWords[1]!; // Äpfel
    const { before, after } = alphabeticNeighbors(umlautWords, current, 2);
    expect(before.map((w) => w.wordProperties?.berlinerisch)).toEqual(["Affe"]);
    expect(after.map((w) => w.wordProperties?.berlinerisch)).toEqual(["Birne"]);
  });
});
