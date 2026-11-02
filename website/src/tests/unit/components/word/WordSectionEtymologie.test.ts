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

  it("renders section when translations are present", async () => {
    const result = await render({
      word: makeWord({
        translations: [{ translation: "Mund" }],
      }),
    });
    expect(result).toContain("Etymologie");
    expect(result).toContain("Bedeutung");
    expect(result).toContain("Mund");
  });

  it("renders section when alternativeWords are present", async () => {
    const result = await render({
      word: makeWord({
        alternativeWords: [{ alternativeWord: "Fresse" }],
      }),
    });
    expect(result).toContain("Etymologie");
    expect(result).toContain("Selbe Bedeutung wie");
    expect(result).toContain("Fresse");
  });

  it("renders multiple translations", async () => {
    const result = await render({
      word: makeWord({
        translations: [{ translation: "Mund" }, { translation: "Maul" }],
      }),
    });
    expect(result).toContain("Mund");
    expect(result).toContain("Maul");
  });

  it("renders the section number element", async () => {
    const result = await render({
      word: makeWord({ infoTextHtml: "Test" }),
    });
    expect(result).toContain("c-section-card__num");
  });

  it("renders aria-labelledby heading-etymologie", async () => {
    const result = await render({
      word: makeWord({ infoTextHtml: "Test" }),
    });
    expect(result).toContain("heading-etymologie");
  });

  it("renders no stray 0 when there are neither translations nor alternatives", async () => {
    const result = await render({ word: makeWord({ infoTextHtml: "<p>Info</p>" }) });
    expect(result).toContain("Info");
    expect(result).not.toMatch(/>\s*0\s*</);
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
