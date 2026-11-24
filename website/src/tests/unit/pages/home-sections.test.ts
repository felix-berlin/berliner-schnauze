// @vitest-environment node
import type { HomeAbout, HomeMagazine, HomeSoundRule } from "@services/payload/home.ts";

import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";

import { createAstroRender } from "../helpers";

// All data invented.
const knowledgeHtml =
  "<p>Testsprache gibt es erfunden, mit über {count} Wörtern.</p>" +
  "<h3>Erste Frage</h3><p>Absatz eins.</p>" +
  "<h3>Zweite Frage</h3><p>Absatz zwei.</p>" +
  '<h3>Dritte Frage</h3><p>Absatz drei mit <a href="/wort/testwort">Testwort</a>.</p>' +
  "<h3>Vierte Frage</h3><p>Absatz vier.</p>";

const soundRules: HomeSoundRule[] = [
  { berlin: "ab", example: "ab cd", rule: "Regel 1", standard: "aa" },
  { berlin: "bc", standard: "bb" },
  { berlin: "cd", example: "cd ef", rule: "Regel 3", standard: "cc" },
  { berlin: "de", standard: "dd" },
  { berlin: "ef", standard: "ee" },
  { berlin: "fg", rule: "Regel 6", standard: "ff" },
];

/** Runs the page's inline scripts at the given viewport side of 808px. */
const domAt = (html: string, wide: boolean) =>
  new JSDOM(`<!doctype html><body>${html}</body>`, {
    beforeParse(window) {
      window.matchMedia = (query: string) =>
        ({
          addEventListener: () => {},
          matches: wide && query.includes("808px"),
          media: query,
          removeEventListener: () => {},
        }) as unknown as MediaQueryList;
    },
    runScripts: "dangerously",
  }).window.document;

describe("BerlinerischArticle.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;
  const props = { knowledgeHtml, linkable: new Map(), soundRules, wordCount: 1234 };

  beforeAll(async () => {
    render = await createAstroRender(
      (await import("@components/home/BerlinerischArticle.astro")).default,
    );
  }, 30_000);

  it("renders the text once, from the third h3 on inside a closed details", async () => {
    const html = await render(props);
    expect(html).toContain("<h2>Wat is Berlinerisch?</h2>");
    expect(html).toContain("über 1.234 Wörtern");
    expect(html.match(/Absatz drei/g)).toHaveLength(1);
    const details = html.indexOf('<details class="more">');
    expect(details).toBeGreaterThan(html.indexOf("Absatz zwei."));
    expect(details).toBeLessThan(html.indexOf("<h3>Dritte Frage</h3>"));
    expect(html).toMatch(/<summary>\s*Mehr über Berlinerisch/);
  });

  it("keeps the folded text in the DOM below and from 808px, open only from 808px", async () => {
    const html = await render(props);
    const narrow = domAt(html, false).querySelector("details")!;
    const wide = domAt(html, true).querySelector("details")!;
    expect(narrow.open).toBe(false);
    expect(wide.open).toBe(true);
    for (const d of [narrow, wide]) expect(d.textContent).toContain("Absatz vier.");
  });

  it("folds nothing when the text has at most two h3", async () => {
    const html = await render({ ...props, knowledgeHtml: "<p>Kurz.</p><h3>Eins</h3><p>Ende.</p>" });
    expect(html).not.toContain("<details");
    expect(html).toContain("Ende.");
  });

  it("drops the whole section without knowledge text", async () => {
    expect(await render({ ...props, knowledgeHtml: undefined })).not.toContain("c-home-knowledge");
  });

  it("renders six sound rules with the struck standard form hidden from screen readers", async () => {
    const html = await render(props);
    expect(html).toContain("Berlinerisch auf einen Blick");
    expect(html.match(/<li class="rule">/g)).toHaveLength(6);
    expect(html.match(/<s aria-hidden="true">/g)).toHaveLength(6);
    // Screen readers get the pairing as text: the struck form is decoration only.
    expect(html.match(/<span class="u-sr-only"> statt \w\w<\/span>/g)).toHaveLength(6);
    expect(html).toMatch(/<b>ab<\/b>\s*<span class="u-sr-only"> statt aa<\/span>/);
    expect(html).toContain('<s aria-hidden="true">aa</s>');
    expect(html).toContain("<b>ab</b>");
    expect(html).toContain("<i>ab cd</i>");
    expect(html).toContain("<small>Regel 6</small>");
  });

  it("links only the typical words that exist", async () => {
    const html = await render({
      ...props,
      linkable: new Map([
        ["Kiez", "kiez"],
        ["Stulle", "stulle"],
      ]),
    });
    expect(html).toContain("Typisch Berlin");
    expect(html).toContain('<a href="/wort/stulle">Stulle</a>');
    expect(html).toContain('<a href="/wort/kiez">Kiez</a>');
    expect(html).not.toContain("Schrippe");
    expect(await render(props)).not.toContain("Typisch Berlin");
  });
});

describe("FaqAbout.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;
  const faq = [1, 2, 3, 4, 5, 6].map((n) => ({
    answerHtml: `<p>Antwort ${n}</p>`,
    question: `Frage ${n}?`,
  }));
  const about: HomeAbout = {
    counts: { audio: 0, topics: 12, votes: 34567 },
    text: "Erfundenes Wörterbuch mit {count} Einträgen.",
  };

  beforeAll(async () => {
    render = await createAstroRender((await import("@components/home/FaqAbout.astro")).default);
  }, 30_000);

  it("renders six questions as details with an h3 in the summary, the first one open", async () => {
    const html = await render({ about, faq, wordCount: 1234 });
    expect(html).toContain("<h2>Häufig jefragt</h2>");
    expect(html.match(/<summary>\s*<h3>Frage \d\?<\/h3>/g)).toHaveLength(6);
    expect(html.match(/<details class="faq"/g)).toHaveLength(6);
    expect(html.match(/<details class="faq" open/g)).toHaveLength(1);
    expect(html).toMatch(/<details class="faq" open>\s*<summary>\s*<h3>Frage 1\?/);
    expect(html).toContain("<p>Antwort 6</p>");
  });

  it("renders the about box with the live count and only the non-zero figures", async () => {
    const html = await render({ about, faq, wordCount: 1234 });
    expect(html).toContain("Über ditt Wörterbuch");
    expect(html).toContain("Erfundenes Wörterbuch mit 1.234 Einträgen.");
    expect(html).toContain("<b>34.567</b>");
    expect(html).toContain("Stimmen in der Umfrage");
    expect(html).not.toContain("Hörproben");
    expect(html).toContain('href="/changelog"');
  });
});

describe("MagazineQuote.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;
  const magazine: HomeMagazine = {
    excerpt: "Erfundene Leseprobe über ein Testwort.",
    ipa: "tɛst",
    others: [1, 2, 3].map((n) => ({ slug: `beitrag-${n}`, title: `Beitrag ${n}` })),
    quote: "Ein erfundenes Zitat.",
    readingMinutes: 6,
    slug: "testbeitrag",
    title: "Warum Test",
  };

  beforeAll(async () => {
    render = await createAstroRender(
      (await import("@components/home/MagazineQuote.astro")).default,
    );
  }, 30_000);

  it("renders quote, linked title, reading time, excerpt and two more titles", async () => {
    const html = await render({ magazine });
    expect(html).toMatch(/<blockquote>\s*<p>Ein erfundenes Zitat\.<\/p>/);
    expect(html).toMatch(/<h3[^>]*>\s*<a href="\/magazin\/testbeitrag">Warum Test<\/a>/);
    expect(html).toContain("6 Min. Lesezeit");
    expect(html).toContain("Erfundene Leseprobe");
    expect(html).toMatch(
      /<span class="field" aria-hidden="true"><span class="ipa">\[tɛst\]<\/span><\/span>/,
    );
    expect(html).toContain('href="/magazin/beitrag-2"');
    expect(html).not.toContain('href="/magazin/beitrag-3"');
  });

  it("drops the section without a post or without a quote", async () => {
    expect(await render({ magazine: null })).not.toContain("c-home-magazine");
    expect(await render({ magazine: { ...magazine, quote: undefined } })).not.toContain(
      "c-home-magazine",
    );
  });

  it("leaves out the outline without an ipa", async () => {
    expect(await render({ magazine: { ...magazine, ipa: undefined } })).not.toContain(
      'class="ipa"',
    );
  });
});

describe("SuggestGap.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    render = await createAstroRender((await import("@components/home/SuggestGap.astro")).default);
  }, 30_000);

  it("renders Kalle pointing, the audio gap hint and both buttons", async () => {
    const html = await render({ gap: { randomSlug: "ohne-ton", wordsWithoutAudio: 1312 } });
    expect(html).toContain("<h2>Fehlt dir een Wort?</h2>");
    expect(html).toMatch(/data-state="point"/);
    expect(html).toMatch(/<b>1\.312<\/b>\s*Wörtern fehlt noch eene Hörprobe\./);
    // Only the hint links to a word; the recording button is a tooltip button until the feature exists.
    expect(html.match(/href="\/wort\/ohne-ton"/g)).toHaveLength(1);
    expect(html).toContain('href="/wort-vorschlagen"');
    expect(html).toContain("Aussprache einsprechen");
  });

  it("leaves out the hint but keeps the recording button without a word to record", async () => {
    const html = await render({ gap: { wordsWithoutAudio: 0 } });
    expect(html).not.toContain("Hörprobe");
    expect(html).toContain("Aussprache einsprechen");
    expect(html).toContain('href="/wort-vorschlagen"');
  });
});
