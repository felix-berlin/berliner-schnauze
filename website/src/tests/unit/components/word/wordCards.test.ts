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

  it("mounts the form, the own-list point and collapsed triggers when the card knows the slug", async () => {
    const html = await examples({ examples: [], slug: "testwort", word: "Testwort" });
    expect(html).toContain('data-own="example"');
    expect(html).toContain('data-word="testwort"');
    expect(html).toContain('data-form="example"');
    expect(html).toContain('aria-expanded="false"');
    expect(await examples({ examples: [], word: "Testwort" })).not.toContain("data-own=");
  });

  it("renders the gap text and the call to action of an empty card verbatim", async () => {
    const e = await examples({ examples: [], word: "Testwort" });
    expect(e).toContain(
      "Noch keen Beispiel für „Testwort“. Kennste ’n Satz, in dem dit Wort vorkommt?",
    );
    expect(e).toContain("Beispiel ergänzen");
    expect(e).toContain('data-contribute="example"');
    const f = await facts({ facts: [], word: "Testwort" });
    expect(f).toContain(
      "Noch nüscht Wissenswertes zu „Testwort“. Weeßte wat über Herkunft, Geschichte oder haste ’ne Anekdote?",
    );
    expect(f).toContain("Wissenswertes ergänzen");
    expect(f).toContain('data-contribute="fact"');
    const n = await network({ model: model() });
    expect(n).toContain(
      "Noch keen Wort mit „Testwort“ verknüpft. Kennste eens mit gleicher Bedeutung, ’n Gegenteil oder ’ne Redewendung?",
    );
    expect(n).toContain("Wort verknüpfen");
    expect(n).toContain('data-contribute="related"');
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

  it("renders Einsprechen as aria-disabled, linked to its tooltip text", async () => {
    const html = await examples({
      examples: [{ example: "Satz.", exampleAudio: [] }],
      word: "Testwort",
    });
    expect(html).toMatch(
      /<button[^>]*aria-disabled="true"[^>]*aria-describedby="einsprechen-tip-0"/,
    );
    expect(html).toMatch(
      /id="einsprechen-tip-0"[^>]*role="tooltip"[^>]*>Kommt bald\. Einsprechen is noch in Arbeit\./,
    );
  });

  it("puts four related words in the net, the rest only in the list, and links only entries with a page", async () => {
    const rel = (label: string, relation: string, url?: string) => ({
      label,
      relation,
      ...(url && { url }),
    });
    const html = await network({
      model: model({
        related: [
          rel("Eins", "gleich", "/wort/eins"),
          rel("Zwei", "gleich", "/wort/zwei"),
          rel("Drei", "gegenteil", "/wort/drei"),
          rel("Vier", "verwandt", "/wort/vier"),
          rel("Fuenf", "redewendung", "/wort/fuenf"),
          rel("NurText", "redewendung"),
        ],
      }),
    });
    const net = html.slice(html.indexOf("<svg"), html.indexOf("</svg>"));
    for (const w of ["Eins", "Zwei", "Drei", "Vier"]) expect(net).toContain(`>${w}<`);
    expect(net).not.toContain("Fuenf");
    const rest = html.slice(html.indexOf('class="rest"'));
    expect(rest).toContain('href="/wort/fuenf"');
    expect(rest).toMatch(/<span>NurText<\/span>/);
    expect(html).not.toContain('href="undefined"');
  });

  it("shows the book block only with a book and escapes visitor text", async () => {
    const withBook = await facts({
      book: {
        disclosure: "CMS-Hinweis zum Partnerlink.",
        title: "Testbuch",
        url: "https://example.test/b",
      },
      facts: [{ kind: "herkunft", text: "<b>x</b> Text" }],
      word: "Testwort",
    });
    expect(withBook).toContain("Testbuch");
    expect(withBook).toContain('rel="sponsored noopener noreferrer"');
    expect(withBook).toContain("data-book-link");
    expect(withBook).toContain("CMS-Hinweis zum Partnerlink.");
    expect(withBook).not.toContain("Amazon-Partner");
    expect(withBook).toContain("&lt;b&gt;x&lt;/b&gt; Text");
    const without = await facts({ facts: [{ kind: "herkunft", text: "Text" }], word: "Testwort" });
    expect(without).not.toContain("Zum Weiterlesen");
    const hostile = await facts({
      book: { title: "Testbuch", url: "javascript:alert(1)" },
      word: "Testwort",
    });
    expect(hostile).not.toContain("javascript:");
  });
});
