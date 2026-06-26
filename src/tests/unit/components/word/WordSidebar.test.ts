// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it, vi } from "vitest";

vi.mock("@styles/components/_word-sidebar.scss", () => ({}));

const makeWordProps = (overrides: Record<string, unknown> = {}) => ({
  berlinerisch: "Schnauze",
  article: "die",
  examples: [{ example: "Det is keen Zufall." }],
  ...overrides,
});

const defaultProps = {
  wordProps: makeWordProps(),
  wordTags: [],
  hasAnagrams: false,
  hasOrthographie: false,
  hasLinguistik: false,
  hasPhonologie: false,
  hasNeighbors: false,
};

describe("WordSidebar.astro", () => {
  async function render(props: Record<string, unknown>) {
    const { default: WordSidebar } = await import("@components/word/WordSidebar.astro");
    const container = await AstroContainer.create();
    return container.renderToString(WordSidebar, { props });
  }

  it("renders the aside with c-word-sidebar class", async () => {
    const result = await render(defaultProps);
    expect(result).toContain("c-word-sidebar");
    expect(result).toContain("<aside");
  });

  it("renders the word title", async () => {
    const result = await render(defaultProps);
    expect(result).toContain("Schnauze");
    expect(result).toContain("c-word-sidebar__word-title");
  });

  it("renders the article when provided", async () => {
    const result = await render(defaultProps);
    expect(result).toContain("die");
    expect(result).toContain("c-word-sidebar__word-subtitle");
  });

  it("does not render article element when article is absent", async () => {
    const result = await render({
      ...defaultProps,
      wordProps: makeWordProps({ article: null }),
    });
    expect(result).not.toContain("c-word-sidebar__word-subtitle");
  });

  it("always renders the Bedeutung nav link", async () => {
    const result = await render(defaultProps);
    expect(result).toContain("Bedeutung");
    expect(result).toContain('href="#etymologie"');
  });

  it("renders the Beispiele link when examples are present", async () => {
    const result = await render(defaultProps);
    expect(result).toContain("Beispiele");
    expect(result).toContain('href="#beispiele"');
  });

  it("does not render the Beispiele link when examples are absent", async () => {
    const result = await render({
      ...defaultProps,
      wordProps: makeWordProps({ examples: null }),
    });
    expect(result).not.toContain('href="#beispiele"');
  });

  it("renders Orthographie link when hasOrthographie is true", async () => {
    const result = await render({ ...defaultProps, hasOrthographie: true });
    expect(result).toContain("Orthographie");
    expect(result).toContain('href="#orthographie"');
  });

  it("does not render Orthographie link when hasOrthographie is false", async () => {
    const result = await render(defaultProps);
    expect(result).not.toContain('href="#orthographie"');
  });

  it("renders Linguistik link when hasLinguistik is true", async () => {
    const result = await render({ ...defaultProps, hasLinguistik: true });
    expect(result).toContain("Linguistik");
    expect(result).toContain('href="#linguistik"');
  });

  it("renders Grammatik link when wordTags is non-empty", async () => {
    const result = await render({
      ...defaultProps,
      wordTags: [{ Schnauze: ["Nomen"] }],
    });
    expect(result).toContain("Grammatik");
    expect(result).toContain('href="#grammatik"');
  });

  it("does not render Grammatik link when wordTags is empty", async () => {
    const result = await render(defaultProps);
    expect(result).not.toContain('href="#grammatik"');
  });

  it("renders Phonologie link when hasPhonologie is true", async () => {
    const result = await render({ ...defaultProps, hasPhonologie: true });
    expect(result).toContain("Phonologie");
    expect(result).toContain('href="#phonologie"');
  });

  it("renders Anagramme link when hasAnagrams is true", async () => {
    const result = await render({ ...defaultProps, hasAnagrams: true });
    expect(result).toContain("Anagramme");
    expect(result).toContain('href="#anagramme"');
  });

  it("does not render Anagramme link when hasAnagrams is false", async () => {
    const result = await render(defaultProps);
    expect(result).not.toContain('href="#anagramme"');
  });

  it("renders Nachbarn link when hasNeighbors is true", async () => {
    const result = await render({ ...defaultProps, hasNeighbors: true });
    expect(result).toContain("Nachbarn");
    expect(result).toContain('href="#navigation"');
  });

  it("renders the nav with aria-label Seitennavigation", async () => {
    const result = await render(defaultProps);
    expect(result).toContain("Seitennavigation");
  });
});
