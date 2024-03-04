import { describe, it, expect } from "vitest";
import { similarSoundingWords } from "@utils/wordHelper";
import * as natural from "natural";
import sinon from "sinon";

describe("similarSoundingWords", () => {
  it("calls natural.SoundEx.compare with the berlinerisch property of each word", ({ is }) => {
    const originalCompare = natural.SoundEx.compare;
    let calledWithArgs = null;

    // Mock the function
    natural.SoundEx.compare = (a, b) => {
      calledWithArgs = [a, b];
      return true;
    };

    const allWords = [
      { id: "1", wordProperties: { berlinerisch: "word1" } },
      { id: "2", wordProperties: { berlinerisch: "word2" } },
    ];
    const currentWord = { id: "1", wordProperties: { berlinerisch: "word1" } };

    similarSoundingWords(allWords, currentWord);

    assert.deepEqual(calledWithArgs, ["word2", "word1"]);

    // Restore the original function
    natural.SoundEx.compare = originalCompare;
  });

  it("should filter out the current word and calculate similarity", () => {
    const allWords = [
      { id: 1, wordProperties: { berlinerisch: "word1" } },
      { id: 2, wordProperties: { berlinerisch: "word2" } },
      { id: 3, wordProperties: { berlinerisch: "word3" } },
    ];
    const currentWord = { id: 2, wordProperties: { berlinerisch: "word2" } };

    const result = similarSoundingWords(allWords, currentWord);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        word: allWords[0],
        isSimilar: natural.SoundEx.compare(
          allWords[0].wordProperties.berlinerisch,
          currentWord.wordProperties.berlinerisch,
        ),
      },
      {
        word: allWords[2],
        isSimilar: natural.SoundEx.compare(
          allWords[2].wordProperties.berlinerisch,
          currentWord.wordProperties.berlinerisch,
        ),
      },
    ]);
  });
});
