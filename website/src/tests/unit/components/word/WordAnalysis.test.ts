// @vitest-environment node
import { resolvePos } from "@utils/wordPos";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createAstroRender } from "../../helpers";

vi.mock("@styles/components/_word-analysis.scss", () => ({}));
vi.mock("@styles/components/_section-card.scss", () => ({}));
vi.mock("@styles/components/_word-hero.scss", () => ({}));
vi.mock("@styles/components/_word-sidebar.scss", () => ({}));
vi.mock("@utils/helpers", () => ({
  routeToWord: vi.fn((slug?: string) => (slug ? `/wort/${slug}` : "/wort/")),
}));

const ref = (berlinerisch: string, id: number) => ({
  berlinerisch,
  id,
  slug: berlinerisch.toLowerCase(),
});
const base = {
  allWords: [ref("Bolle", 5)],
  anagrams: [],
  parts: [],
  similarSpelling: [],
  soundingWords: [],
  word: "Schnauze",
  wordTags: [{ schnauze: ["Nomen", "Femininum"] }],
};

describe("WordAnalysis.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    render = await createAstroRender((await import("@components/word/WordAnalysis.astro")).default);
  }, 30_000);

  it("renders the band h2 and the inner cards as h3 with the old anchors", async () => {
    const html = await render(base);
    expect(html).toContain('id="analyse"');
    expect(html).toMatch(/<h2[^>]*class="c-band"[^>]*>Sprachliche Analyse<\/h2>/);
    for (const id of ["orthographie", "grammatik", "linguistik"]) {
      expect(html).toMatch(new RegExp(`<h3[^>]*id="heading-${id}"`));
    }
  });

  it("joins the syllables with a middle dot and counts them", async () => {
    const html = await render({ ...base, word: "Bammel" });
    expect(html).toContain("Bam · mel");
    expect(html).toContain("2 Silben");
  });

  it("renders Phonologie only with similar-sounding words", async () => {
    expect(await render(base)).not.toContain('id="phonologie"');
    const html = await render({ ...base, soundingWords: [ref("Schnauz", 9)] });
    expect(html).toContain('id="phonologie"');
    expect(html).toContain('href="/wort/schnauz"');
  });

  it("renders the optional Orthographie sub-blocks only when they have content", async () => {
    const plain = await render(base);
    for (const label of ["Wortzerlegung", "Ähnlich geschrieben", "Anagramme"]) {
      expect(plain).not.toContain(label);
    }
    const full = await render({
      ...base,
      anagrams: [ref("Schale", 2)],
      parts: ["schnau", "bolle"],
      similarSpelling: [ref("Schnauzer", 3)],
    });
    expect(full).toContain("Wortzerlegung");
    expect(full).toContain('href="/wort/bolle"');
    expect(full).toContain("Ähnlich geschrieben");
    expect(full).toContain('id="anagramme"');
    expect(full).toContain('href="/wort/schale"');
  });

  it("lists the four key figures and the corpus footer", async () => {
    const html = await render(base);
    for (const label of ["Buchstaben", "Vokale", "Konsonanten", "Verschiedene"]) {
      expect(html).toContain(`<dt>${label}</dt>`);
    }
    expect(html).toContain("Häufigkeit: knapp 180 Mrd. Zeichen aus dem Deutschen Referenzkorpus");
  });

  it("shows one grammar row per token, the shared type on a single word", async () => {
    const html = await render({
      ...base,
      pos: "Adjektiv",
      wordTags: [{ ab: ["Präposition"], notam: ["Nomen"] }],
    });
    expect(html).toContain("Wortart (NLP-Analyse)");
    expect(html).toContain(">Präposition<");
    expect(html).toContain(">Nomen<");
    const single = await render({ ...base, pos: "Adjektiv", wordTags: [{ schnauze: ["Nomen"] }] });
    expect(single).toContain(">Adjektiv<");
    expect(single).not.toContain(">Nomen<");
  });

  it("omits the grammar card without any analysis or type", async () => {
    expect(await render({ ...base, wordTags: [] })).not.toContain('id="grammatik"');
  });
});

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
  let analysis: (p: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    hero = await createAstroRender((await import("@components/word/WordHero.astro")).default);
    sidebar = await createAstroRender((await import("@components/word/WordSidebar.astro")).default);
    analysis = await createAstroRender(
      (await import("@components/word/WordAnalysis.astro")).default,
    );
  }, 30_000);

  const grammarOf = (pos: string | undefined) =>
    analysis({ ...base, pos, word: "Kiekste", wordTags: tags });

  it("a guessed word type reads the same everywhere, with the suffix on the badge only", async () => {
    const resolved = resolvePos(undefined, tags);
    expect(resolved).toEqual({ auto: true, pos: "Verb" });
    const { auto, pos } = resolved!;
    const [h, s, g] = await Promise.all([
      hero({ pos, posAuto: auto, word }),
      sidebar({ posLabel: pos, sections: [], word }),
      grammarOf(pos),
    ]);
    expect(h).toContain("Verb (geraten)");
    expect(s).toContain(">Verb<");
    expect(s).not.toContain("geraten");
    expect(g).toContain(">Verb<");
    expect(g).not.toContain("geraten");
  });

  it("an editorial word type overrides the NLP tag in the grammar card of a single word", async () => {
    const resolved = resolvePos("Adjektiv", tags)!;
    const g = await grammarOf(resolved.pos);
    expect(g).toContain(">Adjektiv<");
    expect(g).not.toContain(">Verb<");
  });
});
