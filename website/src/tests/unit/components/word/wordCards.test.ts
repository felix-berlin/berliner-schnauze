// @vitest-environment node
import type { WordPageModel } from "@services/payload/wordPage.ts";

import { beforeAll, describe, expect, it } from "vitest";

import { createAstroRender } from "../../helpers";

// Invented data only.
const model = (over: Partial<WordPageModel> = {}) =>
  ({
    facts: [],
    grammar: {},
    related: [],
    rhymes: [],
    stories: { items: [], total: 0 },
    syllables: ["Test", "wort"],
    word: { berlinerisch: "Testwort", examples: [], slug: "testwort" },
    written: [],
    ...over,
  }) as unknown as WordPageModel;

describe("v18 word cards", () => {
  let examples: (props: Record<string, unknown>) => Promise<string>;
  let facts: (props: Record<string, unknown>) => Promise<string>;
  let network: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    examples = await createAstroRender(
      (await import("@components/word/WordExamplesCard.astro")).default,
    );
    facts = await createAstroRender((await import("@components/word/WordFactsCard.astro")).default);
    network = await createAstroRender(
      (await import("@components/word/WordNetworkCard.astro")).default,
    );
  }, 30_000);

  it("renders the gap text and the call to action of an empty card verbatim", async () => {
    const e = await examples({ examples: [], word: "Testwort" });
    expect(e).toContain(
      "Noch keen Beispiel für „Testwort“. Kennste ’n Satz, in dem dit Wort vorkommt?",
    );
    expect(e).toContain("Beispiel ergänzen");
    expect(e).toContain('data-contribute="beispiel"');
    const f = await facts({ facts: [], word: "Testwort" });
    expect(f).toContain(
      "Noch nüscht Wissenswertes zu „Testwort“. Weeßte wat über Herkunft, Geschichte oder haste ’ne Anekdote?",
    );
    expect(f).toContain("Wissenswertes ergänzen");
    const n = await network({ model: model() });
    expect(n).toContain(
      "Noch keen Wort mit „Testwort“ verknüpft. Kennste eens mit gleicher Bedeutung, ’n Gegenteil oder ’ne Redewendung?",
    );
    expect(n).toContain("Wort verknüpfen");
  });

  it("renders the neighbours even when there are no related words", async () => {
    const html = await network({
      model: model({
        after: { label: "Nachwort", url: "/wort/nachwort" },
        before: { label: "Vorwort", url: "/wort/vorwort" },
      }),
    });
    expect(html).toContain('href="/wort/vorwort"');
    expect(html).toContain('href="/wort/nachwort"');
    expect(html).toContain("Noch keen Wort mit");
  });

  it("shows the book block only with a book and escapes visitor text", async () => {
    const withBook = await facts({
      book: { title: "Testbuch", url: "https://example.test/b" },
      facts: [{ kind: "herkunft", text: "<b>x</b> Text" }],
      word: "Testwort",
    });
    expect(withBook).toContain("Testbuch");
    expect(withBook).toContain('rel="sponsored noopener"');
    expect(withBook).toContain("&lt;b&gt;x&lt;/b&gt; Text");
    const without = await facts({ facts: [{ kind: "herkunft", text: "Text" }], word: "Testwort" });
    expect(without).not.toContain("Zum Weiterlesen");
  });
});
