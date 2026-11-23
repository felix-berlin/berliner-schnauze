// @vitest-environment node
import type { WordPageModel } from "@services/payload/wordPage.ts";

import WordBadges from "@components/word/WordBadges.vue";
import { beforeAll, describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

import { vTooltip } from "@/directives/tooltip";

import { createAstroRender } from "../../helpers";

// Invented data only.
const story = {
  anders: 0,
  bezirk: "pankow",
  createdAt: "2026-01-01T00:00:00.000Z",
  id: "s1",
  jenau: 2,
  name: "Testkind",
  text: "Meine Tante hat jeden Sonntag Testwörter jeholt.",
} as const;

const model = (over: Partial<WordPageModel> = {}) =>
  ({
    grammar: {},
    related: [],
    rhymes: [],
    stories: { items: [], total: 0 },
    syllables: ["Test", "wort"],
    word: {
      article: "die",
      berlinerisch: "Testwort",
      berlinerischAudio: [],
      derived: { nlpTags: [] },
      slug: "testwort",
      themen: [{ id: 1, name: "Testthema", slug: "testthema" }],
      translations: [{ translation: "Prüfung" }],
      wordTypes: [{ id: 1, name: "Substantiv" }],
    },
    ...over,
  }) as unknown as WordPageModel;

const badges = (props: Record<string, unknown>) =>
  renderToString(
    createSSRApp(WordBadges, { slug: "testwort", ...props }).directive("tooltip", vTooltip),
  );

describe("WordOTon.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;
  beforeAll(async () => {
    const { default: WordOTon } = await import("@components/word/WordOTon.astro");
    render = await createAstroRender(WordOTon);
  }, 30_000);

  it("renders nothing without a featured story", async () => {
    expect((await render({ more: 0, story: null })).trim()).toBe("");
  });

  it("shows quote, label and author with the district", async () => {
    const html = await render({ more: 0, story });
    expect(html).toContain("Meine Tante hat jeden Sonntag Testwörter jeholt.");
    expect(html).toContain("O-Ton");
    expect(html).toContain("Testkind · aus Pankow");
  });

  it("has no link to further stories when there are none", async () => {
    expect(await render({ more: 0, story })).not.toContain("weitere");
  });

  it("links to #jeschichten with the number of further stories", async () => {
    const html = await render({ more: 2, story });
    expect(html).toContain('href="#jeschichten"');
    expect(html).toMatch(/2 weitere Jeschichten\s*<span[^>]*>→<\/span>|2 weitere Jeschichten →/);
  });
});

describe("WordHead.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;
  beforeAll(async () => {
    const { default: WordHead } = await import("@components/word/WordHead.astro");
    render = await createAstroRender(WordHead);
  }, 30_000);

  it("renders no O-Ton without a featured story", async () => {
    expect(await render({ model: model() })).not.toContain("O-Ton");
  });

  it("derives the link text from the story total (3 stories: 2 more)", async () => {
    const html = await render({
      model: model({ featured: story, stories: { items: [story], total: 3 } }),
    });
    expect(html).toContain("2 weitere Jeschichten");
  });

  it("passes trend and word of the day on to the badges", async () => {
    const html = await render({
      model: model({
        trend: { rank: 7, views7: 5 },
        wotd: { date: "2026-11-22" },
      }),
    });
    expect(html).toContain("Gerade beliebt · Platz 7");
    expect(html).toContain("Wort des Tages");
  });

  it("mounts the actions with the canonical word URL, the meaning and the update date, no per-visitor data", async () => {
    const html = await render({
      model: model({
        updatedAt: "2026-01-05T10:00:00.000Z",
        word: { ...model().word, id: 7 } as never,
      }),
    });
    expect(html).toContain("WordActions.vue");
    expect(html).toMatch(/&quot;url&quot;:\[0,&quot;https?:\/\/[^&]+\/wort\/testwort&quot;\]/);
    expect(html).not.toContain("wort-v18");
    expect(html).toContain("&quot;meaning&quot;:[0,&quot;Prüfung&quot;]");
    expect(html).toContain("&quot;updatedAt&quot;:[0,&quot;2026-01-05T10:00:00.000Z&quot;]");
    expect(html).toContain("&quot;wordId&quot;:[0,7]");
  });

  it("gives a draft preview no word id (no reactions)", async () => {
    const html = await render({
      draft: true,
      model: model({ updatedAt: "2026-01-05T10:00:00.000Z" }),
    });
    expect(html).not.toMatch(/&quot;wordId&quot;:\[0,\d/);
  });

  it("shows the word as h1 with its article, the syllables and the meaning", async () => {
    const html = await render({ model: model({ stress: "erste Silbe" }) });
    expect(html).toMatch(/<h1[^>]*>[\s\S]*Testwort/);
    expect(html).toContain(", die");
    expect(html).toContain("Prüfung");
    expect(html).toContain("Testthema");
  });
});

describe("WordBadges.vue", () => {
  it("renders nothing without data", async () => {
    expect(await badges({})).not.toContain("<a");
  });

  // The tooltip text itself is built on the client by v-tooltip (see wordBadges.test.ts).
  it("shows the trend badge text for the beliebt trend", async () => {
    const html = await badges({ trend: { rank: 4, views7: 120 } });
    expect(html).toContain("Gerade beliebt · Platz 4");
  });

  it("renders the word of the day and the trend together", async () => {
    const html = await badges({
      trend: { rank: 4, views7: 120 },
      wotd: { date: "2026-11-22" },
    });
    expect(html).toContain("Wort des Tages");
    expect(html).toContain("heute");
    expect(html).toContain("Gerade beliebt · Platz 4");
  });
});
