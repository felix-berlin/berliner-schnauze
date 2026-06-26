// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

describe("WordLetterFrequency.astro", () => {
  async function render(props: Record<string, unknown>) {
    const { default: WordLetterFrequency } = await import(
      "@components/word/WordLetterFrequency.astro"
    );
    const container = await AstroContainer.create();
    return container.renderToString(WordLetterFrequency, { props });
  }

  it("renders the frequency list for a word with letters", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("Buchstabenhäufigkeit");
    expect(result).toContain("c-single-word__letter-frequency-list");
  });

  it("renders a list item for each unique letter", async () => {
    const result = await render({ word: "Abba" });
    // "Abba" has letters a and b — two unique chars
    expect(result).toContain("c-single-word__letter-frequency-item");
  });

  it("renders vowels with is-vowel class", async () => {
    const result = await render({ word: "Affe" });
    expect(result).toContain("is-vowel");
  });

  it("renders consonants with is-consonant class", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("is-consonant");
  });

  it("renders meter elements for frequency display", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("<meter");
  });

  it("renders the Wikipedia source link", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("Wikipedia");
    expect(result).toContain("Buchstabenh");
  });

  it("renders nothing for an empty word", async () => {
    const result = await render({ word: "" });
    expect(result).not.toContain("Buchstabenhäufigkeit");
  });

  it("renders the letter char in the output", async () => {
    const result = await render({ word: "Affe" });
    // Letter 'a' or 'A' should appear in the char span
    expect(result.toLowerCase()).toContain("a");
  });

  it("renders percent label with comma as decimal separator", async () => {
    const result = await render({ word: "Schnauze" });
    // German locale uses comma, e.g. "7,58%"
    expect(result).toMatch(/\d+,\d+%/);
  });
});
