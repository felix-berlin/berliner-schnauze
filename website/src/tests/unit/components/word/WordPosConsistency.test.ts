// @vitest-environment node
import { resolvePos } from "@utils/wordPos";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createAstroRender } from "../../helpers";

vi.mock("@styles/components/_word-hero.scss", () => ({}));
vi.mock("@styles/components/_word-sidebar.scss", () => ({}));
vi.mock("@styles/components/_section-card.scss", () => ({}));

// Plan review focus: one `pos` for badge, sidebar subtitle and grammar card, "(geraten)" only on the badge.
describe("word type across hero, sidebar and grammar card", () => {
  const word = {
    alternativeWords: [],
    berlinerisch: "Kiekste",
    berlinerischAudio: [],
    berolinismus: false,
    id: 1,
    slug: "kiekste",
    themen: [],
  };
  const tags = [{ kiekste: ["Verb"] }];
  let hero: (p: Record<string, unknown>) => Promise<string>;
  let sidebar: (p: Record<string, unknown>) => Promise<string>;
  let grammar: (p: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    hero = await createAstroRender((await import("@components/word/WordHero.astro")).default);
    sidebar = await createAstroRender(
      (await import("@components/word/WordSidebar.astro")).default,
    );
    grammar = await createAstroRender(
      (await import("@components/word/WordSectionGrammatik.astro")).default,
    );
  }, 30_000);

  it("a guessed word type reads the same everywhere, with the suffix on the badge only", async () => {
    const resolved = resolvePos(undefined, tags);
    expect(resolved).toEqual({ auto: true, pos: "Verb" });
    const { auto, pos } = resolved!;
    const [h, s, g] = await Promise.all([
      hero({ pos, posAuto: auto, word }),
      sidebar({ posLabel: pos, sections: [], word }),
      grammar({ pos, wordTags: tags }),
    ]);
    expect(h).toContain("Verb (geraten)");
    expect(s).toContain(">Verb<");
    expect(s).not.toContain("geraten");
    expect(g).toContain(">Verb<");
    expect(g).not.toContain("geraten");
  });

  it("an editorial word type overrides the NLP tag in the grammar card of a single word", async () => {
    const resolved = resolvePos("Adjektiv", tags)!;
    expect(resolved).toEqual({ auto: false, pos: "Adjektiv" });
    const g = await grammar({ pos: resolved.pos, wordTags: tags });
    expect(g).toContain(">Adjektiv<");
    expect(g).not.toContain(">Verb<");
  });
});
