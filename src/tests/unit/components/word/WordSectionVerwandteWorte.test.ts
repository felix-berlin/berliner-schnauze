// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { createAstroRender } from "../../helpers";

const makeRelatedWords = (words: { berlinerisch: string; slug: string }[] = []) => ({
  nodes: words.map(({ berlinerisch, slug }) => ({
    slug,
    wordProperties: { berlinerisch },
  })),
});

describe("WordSectionVerwandteWorte.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordSectionVerwandteWorte } = await import(
      "@components/word/WordSectionVerwandteWorte.astro"
    );
    render = await createAstroRender(WordSectionVerwandteWorte);
  }, 30_000);

  it("renders nothing when relatedWords is null", async () => {
    const result = await render({ relatedWords: null, currentWord: "Schnauze" });
    expect(result).not.toContain("Verwandte Worte");
  });

  it("renders nothing when relatedWords nodes are empty", async () => {
    const result = await render({
      relatedWords: makeRelatedWords(),
      currentWord: "Schnauze",
    });
    expect(result).not.toContain("Verwandte Worte");
  });

  it("renders nothing when only the current word is in the list", async () => {
    const result = await render({
      relatedWords: makeRelatedWords([{ berlinerisch: "Schnauze", slug: "schnauze" }]),
      currentWord: "Schnauze",
    });
    expect(result).not.toContain("Verwandte Worte");
  });

  it("renders the section when related words are present", async () => {
    const result = await render({
      relatedWords: makeRelatedWords([{ berlinerisch: "Fresse", slug: "fresse" }]),
      currentWord: "Schnauze",
    });
    expect(result).toContain("Verwandte Worte");
    expect(result).toContain('id="verwandte-worte"');
    expect(result).toContain("c-section-card");
  });

  it("renders the related word links", async () => {
    const result = await render({
      relatedWords: makeRelatedWords([{ berlinerisch: "Fresse", slug: "fresse" }]),
      currentWord: "Schnauze",
    });
    expect(result).toContain("Fresse");
    expect(result).toContain("c-single-word__related-word-link");
  });

  it("filters out the current word from the list", async () => {
    const result = await render({
      relatedWords: makeRelatedWords([
        { berlinerisch: "Schnauze", slug: "schnauze" },
        { berlinerisch: "Fresse", slug: "fresse" },
      ]),
      currentWord: "Schnauze",
    });
    expect(result).toContain("Fresse");
    expect(result).not.toContain("/wort/schnauze");
  });

  it("renders the section number element", async () => {
    const result = await render({
      relatedWords: makeRelatedWords([{ berlinerisch: "Fresse", slug: "fresse" }]),
      currentWord: "Schnauze",
    });
    expect(result).toContain("c-section-card__num");
  });

  it("renders aria-labelledby heading-verwandte", async () => {
    const result = await render({
      relatedWords: makeRelatedWords([{ berlinerisch: "Fresse", slug: "fresse" }]),
      currentWord: "Schnauze",
    });
    expect(result).toContain("heading-verwandte");
  });
});
