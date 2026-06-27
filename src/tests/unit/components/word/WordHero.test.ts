// @vitest-environment node
import { describe, expect, it, vi, beforeAll } from "vitest";
import { createAstroRender } from "../../helpers";

vi.mock("@styles/components/_word-hero.scss", () => ({}));

const makeWordProps = (overrides: Record<string, unknown> = {}) => ({
  berlinerisch: "Schnauze",
  article: "die",
  berolinismus: false,
  berlinerischAudio: null,
  ...overrides,
});

const makeWord = (wordProps = makeWordProps()) => ({
  berlinerWordId: 42,
  slug: "schnauze",
  wordProperties: wordProps,
});

describe("WordHero.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordHero } = await import("@components/word/WordHero.astro");
    render = await createAstroRender(WordHero);
  }, 30_000);

  it("renders .c-word-hero header element", async () => {
    const wordProps = makeWordProps();
    const result = await render({ word: makeWord(wordProps), wordProps, wortartLabel: undefined });
    expect(result).toContain("c-word-hero");
  });

  it("renders the berlinerisch word in a dfn tag", async () => {
    const wordProps = makeWordProps();
    const result = await render({ word: makeWord(wordProps), wordProps, wortartLabel: undefined });
    expect(result).toContain("Schnauze");
    expect(result).toContain("<dfn>");
  });

  it("renders article when provided", async () => {
    const wordProps = makeWordProps({ article: "die" });
    const result = await render({ word: makeWord(wordProps), wordProps, wortartLabel: undefined });
    expect(result).toContain("die");
    expect(result).toContain("c-word-hero__word-article");
  });

  it("does not render article element when article is absent", async () => {
    const wordProps = makeWordProps({ article: null });
    const result = await render({ word: makeWord(wordProps), wordProps, wortartLabel: undefined });
    expect(result).not.toContain("c-word-hero__word-article");
  });

  it("renders wortartLabel badge when provided", async () => {
    const wordProps = makeWordProps();
    const result = await render({ word: makeWord(wordProps), wordProps, wortartLabel: "Verb" });
    expect(result).toContain("Verb");
    expect(result).toContain("c-word-hero__wortart-badge");
  });

  it("does not render wortartLabel badge when undefined", async () => {
    const wordProps = makeWordProps();
    const result = await render({ word: makeWord(wordProps), wordProps, wortartLabel: undefined });
    expect(result).not.toContain("c-word-hero__wortart-badge");
  });

  it("renders left and right layout columns", async () => {
    const wordProps = makeWordProps();
    const result = await render({ word: makeWord(wordProps), wordProps, wortartLabel: undefined });
    expect(result).toContain("c-word-hero__left");
    expect(result).toContain("c-word-hero__right");
  });
});
