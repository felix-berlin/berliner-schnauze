import { similarSoundingWords } from "@utils/wordHelper";
import * as natural from "natural";
import { describe, it, expect } from "vitest";

const SoundEx = natural.SoundEx;

describe("similarSoundingWords", () => {
  it("returns only the other words sharing the current word's soundex code", () => {
    const allWords = [
      { id: "1", wordProperties: { berlinerisch: "Smith" } },
      { id: "2", wordProperties: { berlinerisch: "Smyth" } },
      { id: "3", wordProperties: { berlinerisch: "Pier" } },
    ];
    const currentWord = allWords[1]!;

    const result = similarSoundingWords(allWords, currentWord);

    const expected = allWords.filter(
      (w) =>
        w.id !== currentWord.id &&
        new SoundEx().compare(
          w.wordProperties.berlinerisch,
          currentWord.wordProperties.berlinerisch,
        ),
    );
    expect(expected).toHaveLength(1);
    expect(result).toEqual(expected);
  });
});
