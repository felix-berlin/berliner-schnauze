import { describe, it, expect } from "vitest";
import { getWordType } from "@utils/wordHelper";
import nlp from "de-compromise";

describe("getWordType", () => {
  it("should return the correct word type", () => {
    const word = "running";
    const doc = nlp(word);
    const expectedTags = doc.out("tags");

    const result = getWordType(word);

    expect(result).toEqual(expectedTags);
  });
});
