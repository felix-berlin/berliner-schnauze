// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { createAstroRender } from "../../helpers";

describe("WordSectionGrammatik.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordSectionGrammatik } = await import("@components/word/WordSectionGrammatik.astro");
    render = await createAstroRender(WordSectionGrammatik);
  }, 30_000);

  it("renders nothing when wordTags is empty", async () => {
    const result = await render({ wordTags: [] });
    expect(result).not.toContain("Grammatik");
  });

  it("renders the Grammatik section when wordTags are provided", async () => {
    const result = await render({
      wordTags: [{ Schnauze: ["Nomen", "Femininum"] }],
    });
    expect(result).toContain("Grammatik");
    expect(result).toContain("c-section-card");
    expect(result).toContain('id="grammatik"');
  });

  it("renders the word with capitalized first letter when Nomen tag present", async () => {
    const result = await render({
      wordTags: [{ schnauze: ["Nomen"] }],
    });
    // When Nomen is present, capitalizeFirstLetter is applied
    expect(result).toContain("Schnauze");
  });

  it("renders the word as-is when Nomen tag is absent", async () => {
    const result = await render({
      wordTags: [{ laufen: ["Verb"] }],
    });
    expect(result).toContain("laufen");
  });

  it("renders each grammar tag as a span", async () => {
    const result = await render({
      wordTags: [{ Schnauze: ["Nomen", "Femininum"] }],
    });
    expect(result).toContain("Nomen");
    expect(result).toContain("Femininum");
    expect(result).toContain("c-section-card__grammar-tag");
  });

  it("renders the NLP analysis label", async () => {
    const result = await render({
      wordTags: [{ Schnauze: ["Nomen"] }],
    });
    expect(result).toContain("NLP-Analyse");
  });

  it("renders the section number 05", async () => {
    const result = await render({
      wordTags: [{ Schnauze: ["Nomen"] }],
    });
    expect(result).toContain("05");
  });

  it("renders aria-labelledby heading-grammatik", async () => {
    const result = await render({
      wordTags: [{ Schnauze: ["Nomen"] }],
    });
    expect(result).toContain("heading-grammatik");
  });
});
