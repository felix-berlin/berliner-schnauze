// @vitest-environment node
import { describe, expect, it, vi, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

vi.mock("@styles/components/_word-hero.scss", () => ({}));
vi.mock("@styles/components/_word-themes.scss", () => ({}));

const makeWord = (overrides: Record<string, unknown> = {}) => ({
  alternativeWords: [],
  article: "die",
  berlinerisch: "Schnauze",
  berlinerischAudio: [],
  berolinismus: false,
  id: 1,
  slug: "schnauze",
  themen: [],
  ...overrides,
});

describe("WordHero.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: WordHero } = await import("@components/word/WordHero.astro");
    render = await createAstroRender(WordHero);
  }, 30_000);

  it("renders .c-word-hero header element with the #bedeutung anchor", async () => {
    const result = await render({ word: makeWord() });
    expect(result).toContain("c-word-hero");
    expect(result).toContain('id="bedeutung"');
  });

  it("renders the berlinerisch word as headword in a dfn tag", async () => {
    const result = await render({ word: makeWord() });
    expect(result).toMatch(/<dfn class="headword[^"]*">Schnauze<\/dfn>/);
  });

  it("renders article when provided, not when absent", async () => {
    expect(await render({ word: makeWord({ article: "die" }) })).toContain('class="article"');
    expect(await render({ word: makeWord({ article: null }) })).not.toContain('class="article"');
  });

  it("renders the word type as plain badge, without suffix for an editorial value", async () => {
    const result = await render({ pos: "Verb", word: makeWord() });
    expect(result).toContain("Verb");
    expect(result).not.toContain("geraten");
    expect(result).not.toContain('data-variant="wash auto"');
  });

  it("marks a guessed word type as (geraten) with the auto badge", async () => {
    const result = await render({ pos: "Verb", posAuto: true, word: makeWord() });
    expect(result).toContain("Verb (geraten)");
    expect(result).toContain('data-variant="wash auto"');
  });

  it("renders no word type badge when pos is undefined", async () => {
    const result = await render({ word: makeWord() });
    expect(result).not.toContain("c-badge");
  });

  it("puts the Themen in their own row after the badges, not among them", async () => {
    const result = await render({
      pos: "Nomen",
      word: makeWord({ themen: [{ id: 1, name: "Essen", slug: "essen" }] }),
    });
    expect(result).toContain('href="/themen/essen"');
    expect(result).toContain("c-word-themes");
    const badges = result.slice(result.indexOf('class="badges"'), result.indexOf("c-word-themes"));
    expect(badges).not.toContain("/themen/essen");
    expect(result.indexOf('class="badges"')).toBeLessThan(result.indexOf("c-word-themes"));
  });

  it("renders no Themen row for a word without Themen", async () => {
    expect(await render({ word: makeWord() })).not.toContain("c-word-themes");
  });

  it("puts actions before the badges so focus runs Like, menu, badges, Themen", async () => {
    const result = await render({
      pos: "Nomen",
      word: makeWord({ themen: [{ id: 1, name: "Essen", slug: "essen" }] }),
    });
    expect(result.indexOf('class="actions"')).toBeLessThan(result.indexOf('class="badges"'));
    expect(result.indexOf('class="title"')).toBeLessThan(result.indexOf('class="actions"'));
  });

  it("shows the alternative words as 'Selbe Bedeutung wie'", async () => {
    const result = await render({
      word: makeWord({
        alternativeWords: [{ alternativeWord: "Kiez" }, { alternativeWord: "Kietz" }],
      }),
    });
    expect(result).toContain("Selbe Bedeutung wie");
    expect(result).toContain("Kiez, Kietz");
  });

  it("hides the meaning block without meanings and alternatives", async () => {
    expect(await render({ word: makeWord() })).not.toContain('class="meaning"');
  });
});
