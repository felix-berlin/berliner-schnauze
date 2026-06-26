// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it, vi, beforeAll } from "vitest";

vi.mock("@utils/helpers", () => ({
  routeToWord: vi.fn((slug?: string) => (slug ? `/wort/${slug}` : "/wort/")),
}));

describe("WordSectionOrthographie.astro", () => {
  let container: InstanceType<typeof AstroContainer>;
  let WordSectionOrthographie: any;

  beforeAll(async () => {
    container = await AstroContainer.create();
    const mod = await import("@components/word/WordSectionOrthographie.astro");
    WordSectionOrthographie = mod.default;
  }, 30_000);

  async function render(props: Record<string, unknown>) {
    return container.renderToString(WordSectionOrthographie, { props });
  }

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

  it("renders the section number 03", async () => {
    const result = await render({ word: "Schnauze", allWords: [] });
    expect(result).toContain("03");
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
