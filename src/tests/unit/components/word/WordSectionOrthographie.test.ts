// @vitest-environment node
import { describe, expect, it, vi, beforeAll } from "vitest";
import { createAstroRender } from "../../helpers";

vi.mock("@utils/helpers", () => ({
  routeToWord: vi.fn((slug?: string) => (slug ? `/wort/${slug}` : "/wort/")),
}));

describe("WordSectionOrthographie.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordSectionOrthographie } = await import("@components/word/WordSectionOrthographie.astro");
    render = await createAstroRender(WordSectionOrthographie);
  }, 30_000);

  it("renders nothing for an empty word", async () => {
    const result = await render({ word: "", allWords: [] });
    expect(result).not.toContain("Orthographie");
  });

  it("renders the section for a non-empty word", async () => {
    const result = await render({ word: "Schnauze", allWords: [] });
    expect(result).toContain("Orthographie");
    expect(result).toContain("c-section-card");
    expect(result).toContain('id="orthographie"');
  });

  it("renders syllable separation heading", async () => {
    const result = await render({ word: "Schnauze", allWords: [] });
    expect(result).toContain("Silbentrennung");
  });

  it("renders syllable count heading", async () => {
    const result = await render({ word: "Schnauze", allWords: [] });
    expect(result).toContain("Anzahl der Silben");
  });

  it("renders the section number element", async () => {
    const result = await render({ word: "Schnauze", allWords: [] });
    expect(result).toContain("c-section-card__num");
  });

  it("renders aria-labelledby heading-orthographie", async () => {
    const result = await render({ word: "Schnauze", allWords: [] });
    expect(result).toContain("heading-orthographie");
  });

  it("renders syllables divided by separator for multi-syllable word", async () => {
    // hypher will split "Berliner" into syllables
    const result = await render({ word: "Berliner", allWords: [] });
    expect(result).toContain("is-divider");
  });

  it("accepts allWords array without throwing", async () => {
    const allWords = [{ slug: "bahn", wordProperties: { berlinerisch: "Bahn" } }];
    const result = await render({ word: "Bahnhof", allWords });
    expect(result).toContain("Orthographie");
  });
});
