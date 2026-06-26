// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { createAstroRender } from "../../helpers";

const makeWordProps = (overrides: Record<string, unknown> = {}) => ({
  berlinerisch: "Schnauze",
  infoText: null,
  alternativeWords: [],
  translations: [],
  ...overrides,
});

describe("WordSectionEtymologie.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordSectionEtymologie } = await import(
      "@components/word/WordSectionEtymologie.astro"
    );
    render = await createAstroRender(WordSectionEtymologie);
  }, 30_000);

  it("renders nothing when no content is present", async () => {
    const result = await render({ wordProps: makeWordProps() });
    expect(result).not.toContain("Etymologie");
  });

  it("renders the section when infoText is present", async () => {
    const result = await render({
      wordProps: makeWordProps({ infoText: "<p>Berliner Ausdruck</p>" }),
    });
    expect(result).toContain("Etymologie");
    expect(result).toContain("c-section-card");
    expect(result).toContain('id="etymologie"');
  });

  it("renders infoText HTML content", async () => {
    const result = await render({
      wordProps: makeWordProps({ infoText: "<p>Berliner Ausdruck</p>" }),
    });
    expect(result).toContain("Berliner Ausdruck");
  });

  it("renders section when translations are present", async () => {
    const result = await render({
      wordProps: makeWordProps({
        translations: [{ translation: "Mund" }],
      }),
    });
    expect(result).toContain("Etymologie");
    expect(result).toContain("Bedeutung");
    expect(result).toContain("Mund");
  });

  it("renders section when alternativeWords are present", async () => {
    const result = await render({
      wordProps: makeWordProps({
        alternativeWords: [{ alternativeWord: "Fresse" }],
      }),
    });
    expect(result).toContain("Etymologie");
    expect(result).toContain("Selbe Bedeutung wie");
    expect(result).toContain("Fresse");
  });

  it("renders multiple translations", async () => {
    const result = await render({
      wordProps: makeWordProps({
        translations: [{ translation: "Mund" }, { translation: "Maul" }],
      }),
    });
    expect(result).toContain("Mund");
    expect(result).toContain("Maul");
  });

  it("renders the section number 01", async () => {
    const result = await render({
      wordProps: makeWordProps({ infoText: "Test" }),
    });
    expect(result).toContain("01");
  });

  it("renders aria-labelledby heading-etymologie", async () => {
    const result = await render({
      wordProps: makeWordProps({ infoText: "Test" }),
    });
    expect(result).toContain("heading-etymologie");
  });

  it("renders nothing when wordProps is null", async () => {
    const result = await render({ wordProps: null });
    expect(result).not.toContain("Etymologie");
  });
});
