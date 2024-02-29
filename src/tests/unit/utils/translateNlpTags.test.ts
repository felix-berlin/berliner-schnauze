import { describe, it, expect } from "vitest";
import { translateNlpTags } from "@utils/wordHelper";

describe("translateNlpTags", () => {
  it("should translate English tags to German", () => {
    const englishTags = [
      { word1: ["Noun", "Singular"] },
      { word2: ["Verb", "Plural"] },
      { word3: ["Adjective", "ProperNoun"] },
    ];

    const expectedGermanTags = [
      { word1: ["Nomen", "Einzahl"] },
      { word2: ["Verb", "Mehrzahl"] },
      { word3: ["Adjektiv", "Eigenname"] },
    ];

    expect(translateNlpTags(englishTags)).toEqual(expectedGermanTags);
  });

  it("should leave tags as is if no translation is found", () => {
    const englishTags = [{ word1: ["NonExistentTag1"] }, { word2: ["NonExistentTag2"] }];

    const expectedTags = [{ word1: ["NonExistentTag1"] }, { word2: ["NonExistentTag2"] }];

    expect(translateNlpTags(englishTags)).toEqual(expectedTags);
  });
});
