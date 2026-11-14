// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

const makeWord = (overrides: Record<string, unknown> = {}) => ({
  alternativeWords: [],
  hasInfoText: false,
  infoTextHtml: null,
  sources: [],
  translations: [],
  ...overrides,
});

describe("WordSectionEtymologie.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordSectionEtymologie } =
      await import("@components/word/WordSectionEtymologie.astro");
    render = await createAstroRender(WordSectionEtymologie);
  }, 30_000);

  it("renders nothing when no content is present", async () => {
    const result = await render({ word: makeWord() });
    expect(result).not.toContain("Etymologie");
  });

  it("renders the section when infoText is present", async () => {
    const result = await render({
      word: makeWord({ infoTextHtml: "<p>Berliner Ausdruck</p>" }),
    });
    expect(result).toContain("Etymologie");
    expect(result).toContain("c-section-card");
    expect(result).toContain('id="etymologie"');
  });

  it("renders infoText HTML content", async () => {
    const result = await render({
      word: makeWord({ infoTextHtml: "<p>Berliner Ausdruck</p>" }),
    });
    expect(result).toContain("Berliner Ausdruck");
  });

  it("renders nothing for a word with only meanings and alternatives (the hero owns them)", async () => {
    const result = await render({
      word: makeWord({
        alternativeWords: [{ alternativeWord: "Fresse" }],
        translations: [{ translation: "Mund" }],
      }),
    });
    expect(result).not.toContain("Etymologie");
    expect(result).not.toContain("Mund");
  });

  it("does not repeat meanings or alternatives next to the origin", async () => {
    const result = await render({
      word: makeWord({
        alternativeWords: [{ alternativeWord: "Fresse" }],
        infoTextHtml: "<p>Herkunft</p>",
        translations: [{ translation: "Mund" }],
      }),
    });
    expect(result).toContain("Herkunft");
    expect(result).not.toContain("Mund");
    expect(result).not.toContain("Selbe Bedeutung");
  });

  it("renders only the sources footer for a word without origin text", async () => {
    const result = await render({ word: makeWord({ sources: ["Meyer"] }) });
    expect(result).toContain("Quelle");
    expect(result).not.toContain("Quellen");
    expect(result).not.toContain('class="body"');
  });

  it("omits the footer without sources", async () => {
    const result = await render({ word: makeWord({ infoTextHtml: "<p>Info</p>" }) });
    expect(result).not.toContain("<footer");
  });

  it("renders aria-labelledby heading-etymologie", async () => {
    const result = await render({
      word: makeWord({ infoTextHtml: "Test" }),
    });
    expect(result).toContain("heading-etymologie");
  });

  it("lists the sources and links a source given as 'Label : url'", async () => {
    const result = await render({
      word: makeWord({ sources: ["Meyer", "Berlinisch : https://example.org/b"] }),
    });
    expect(result).toContain("Quellen");
    expect(result).toContain("Meyer");
    expect(result).toContain('href="https://example.org/b"');
  });
});
