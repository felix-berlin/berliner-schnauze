import { similarSoundingWords } from "@utils/wordHelper";
import * as natural from "natural";
import { describe, it, expect } from "vitest";

const SoundEx = natural.SoundEx;

describe("similarSoundingWords", () => {
  it("returns only the other words sharing the current word's soundex code", () => {
    const allWords = [
      { berlinerisch: "Smith", id: 1 },
      { berlinerisch: "Smyth", id: 2 },
      { berlinerisch: "Pier", id: 3 },
    ];
    const currentWord = allWords[1]!;

    const result = similarSoundingWords(allWords, currentWord);

    const expected = allWords.filter(
      (w) =>
        w.id !== currentWord.id &&
        new SoundEx().compare(
          w.berlinerisch,
          currentWord.berlinerisch,
        ),
    );
    expect(expected).toHaveLength(1);
    expect(result).toEqual(expected);
  });
});
