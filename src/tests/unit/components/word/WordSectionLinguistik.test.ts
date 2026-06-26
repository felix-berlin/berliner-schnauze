// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it, vi } from "vitest";

vi.mock("@styles/components/_word-curiosities.scss", () => ({}));

describe("WordSectionLinguistik.astro", () => {
  async function render(props: Record<string, unknown>) {
    const { default: WordSectionLinguistik } = await import(
      "@components/word/WordSectionLinguistik.astro"
    );
    const container = await AstroContainer.create();
    return container.renderToString(WordSectionLinguistik, { props });
  }

  it("renders nothing for an empty word", async () => {
    const result = await render({ word: "" });
    expect(result).not.toContain("Quantitative Linguistik");
  });

  it("renders the section for a non-empty word", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("Quantitative Linguistik");
    expect(result).toContain("c-section-card");
    expect(result).toContain('id="linguistik"');
  });

  it("renders the letter count", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("Buchstaben");
    // "Schnauze" has 8 letters
    expect(result).toContain("8");
  });

  it("renders vowel count", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("Vokale");
  });

  it("renders consonant count", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("Konsonanten");
  });

  it("renders the consonants and vowels section", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("Konsonanten und Vokale");
  });

  it("renders the cv legend", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("c-section-card__cv-legend");
    expect(result).toContain("Konsonant");
    expect(result).toContain("Vokal");
  });

  it("renders letter frequency sub-component", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("Buchstabenhäufigkeit");
  });

  it("renders word curiosities sub-component for words of 5+ chars", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("Wortkuriositäten");
  });

  it("renders the section number 04", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("04");
  });

  it("renders aria-labelledby heading-linguistik", async () => {
    const result = await render({ word: "Schnauze" });
    expect(result).toContain("heading-linguistik");
  });

  it("renders colored vowel spans", async () => {
    const result = await render({ word: "Affe" });
    expect(result).toContain("is-vowel");
    expect(result).toContain("is-consonant");
  });
});
