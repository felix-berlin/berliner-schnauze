// @vitest-environment node
import type { WordPageModel } from "@services/payload/wordPage.ts";

import { beforeAll, describe, expect, it } from "vitest";

import { createAstroRender } from "../../helpers";

// Invented data only.
const model = {
  facts: [],
  grammar: {},
  poll: { byAge: [], byRegion: [], matrix: [], shares: { kenn: 0, nie: 0, selbst: 0 }, total: 0 },
  related: [],
  rhymes: [],
  stories: { items: [], total: 0 },
  storyPrompt: "",
  syllables: ["Test", "wort"],
  updatedAt: "2026-01-01T00:00:00.000Z",
  word: {
    article: null,
    berlinerisch: "Testwort",
    berlinerischAudio: [{ audio: { url: "https://example.test/a.mp3" }, gender: "male" }],
    derived: { nlpTags: [] },
    examples: [],
    id: 42,
    slug: "testwort",
    themen: [],
    translations: [],
    wordTypes: [],
  },
  written: [],
} as unknown as WordPageModel;

describe("WordPage mobile bar", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;
  beforeAll(async () => {
    render = await createAstroRender((await import("@components/word/WordPage.astro")).default);
  }, 60_000);

  it("renders the bar with the poll anchor and the model's word id for the pulse", async () => {
    const html = await render({ model });
    expect(html).toContain("c-word-mobile-bar");
    expect(html).toContain('data-word-id="42"');
    expect(html).toContain('id="sagste"');
    expect(html).toContain('href="#sagste"');
  });

  it("mounts the poll in the sagste slot with the shared result only, no own vote", async () => {
    const html = await render({ model });
    const slot = html.slice(html.indexOf('id="sagste"'), html.indexOf('id="jeschichten"'));
    expect(slot).toContain("Sagste det noch?");
    expect(slot).toContain("Is dit Wort bei dir noch im Einsatz?");
    expect(slot).not.toContain("deine Stimme");
  });

  it("counts no plays for a draft preview", async () => {
    const html = await render({ draft: true, model });
    expect(html).toContain("c-word-mobile-bar");
    expect(html).not.toContain("data-word-id");
  });

  it("does not take a grid cell for a card without rows", async () => {
    const html = await render({ model });
    expect(html).not.toContain('id="grammatik"'); // no Grammatik rows in this model
    expect(html).toContain('id="klang"');
  });

  it("mounts the Jeschichten card with its count and the report form, and wires the triggers", async () => {
    const html = await render({
      model: {
        ...model,
        stories: { items: [], total: 4 },
        storyPrompt: "Wo haste „Testwort“ jehört?",
      },
    });
    expect(html).toContain("4 Jeschichten");
    expect(html).toContain("Wo haste");
    expect(html).toContain('data-form="example"');
    expect(html).toContain("data-report");
    expect(await render({ model })).toContain("Noch keene");
  });
});
