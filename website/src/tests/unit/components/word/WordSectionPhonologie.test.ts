// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

const ref = (slug: string, berlinerisch: string) => ({ slug, wordProperties: { berlinerisch } });

describe("WordSectionPhonologie.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordSectionPhonologie } =
      await import("@components/word/WordSectionPhonologie.astro");
    render = await createAstroRender(WordSectionPhonologie);
  }, 30_000);

  it("renders nothing without sounding or similar words", async () => {
    const result = await render({ similarSpelling: [], soundingWords: [] });
    expect(result).not.toContain("Phonologie");
  });

  it("lists similar-sounding words with links", async () => {
    const result = await render({ similarSpelling: [], soundingWords: [ref("jut", "jut")] });
    expect(result).toContain('id="phonologie"');
    expect(result).toContain("Ähnlich klingende Wörter");
    expect(result).toContain('href="/wort/jut"');
    expect(result).not.toContain("Ähnlich geschrieben");
  });

  it("lists similarly spelled words via WordSimilarSpelling", async () => {
    const result = await render({ similarSpelling: [ref("icke", "icke")], soundingWords: [] });
    expect(result).toContain("Ähnlich geschrieben");
    expect(result).toContain('data-content-piece="icke"');
    expect(result).toContain('class="c-single-word__related-word-link" href="/wort/icke"');
    expect(result).not.toContain("Ähnlich klingende Wörter");
  });
});
