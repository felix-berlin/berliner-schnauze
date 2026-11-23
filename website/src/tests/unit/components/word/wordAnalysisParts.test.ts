// @vitest-environment node
import type { WordPageModel } from "@services/payload/wordPage.ts";

import { beforeAll, describe, expect, it } from "vitest";

import { createAstroRender } from "../../helpers";

// Invented data only.
const model = (over: Partial<WordPageModel> = {}, word: Record<string, unknown> = {}) =>
  ({
    grammar: {},
    rhymes: [],
    syllables: ["Test", "wort"],
    word: {
      article: null,
      berlinerisch: "Testwort",
      derived: { nlpTags: [] },
      wordTypes: [],
      ...word,
    },
    ...over,
  }) as unknown as WordPageModel;

type Render = (props: Record<string, unknown>) => Promise<string>;
const load = async (name: string): Promise<Render> =>
  createAstroRender((await import(`@components/word/${name}.astro`)).default);

describe("WordAnalysisCard", () => {
  let render: Render;
  beforeAll(async () => {
    render = await load("WordAnalysisCard");
  }, 30_000);

  const rows = [
    { label: "Silben", text: "Test·wort" },
    { label: "Reimt sich auf", links: [{ label: "Reimwort", url: "/wort/reimwort" }] },
  ];

  it("renders the rows as a description list, links as links", async () => {
    const html = await render({ id: "klang", rows, title: "Klang" });
    expect(html).toContain("Test·wort");
    expect(html).toContain('href="/wort/reimwort"');
    expect(html.match(/<dt/g)).toHaveLength(4); // wide card + fold, same rows twice
  });

  it("has a details fold that is closed", async () => {
    const html = await render({ id: "klang", rows, title: "Klang" });
    expect(html).toMatch(/<details[^>]*>/);
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
    expect(html).toMatch(/<summary[^>]*>/);
  });

  it("puts no heading inside the summary", async () => {
    const html = await render({ id: "klang", rows, title: "Klang" });
    expect(html).not.toMatch(/<summary[^>]*>\s*<h\d/);
  });

  it("renders nothing without rows", async () => {
    expect((await render({ id: "klang", rows: [], title: "Klang" })).trim()).toBe("");
  });
});

describe("WordNumbers", () => {
  let render: Render;
  beforeAll(async () => {
    render = await load("WordNumbers");
  }, 30_000);

  it("hides the dot columns and gives the four figures as the accessible version", async () => {
    const html = await render({ model: model() });
    expect(html).toMatch(/class="cols"[^>]*aria-hidden="true"/);
    for (const label of ["Buchstaben", "Silben", "Vokale", "Konsonanten"]) {
      expect(html).toContain(`<dt>${label}</dt>`);
    }
    expect(html).toContain("<dd>8</dd>");
    expect(html).toContain("<dd>2</dd>");
    expect(html).toContain("<dd>6</dd>");
    expect(html).toContain("Jeder Punkt: 2 % Häufigkeit im Deutschen. Gelb: Vokale.");
  });
});

describe("WordReportLine", () => {
  let render: Render;
  beforeAll(async () => {
    render = await load("WordReportLine");
  }, 30_000);

  it("renders the copy verbatim and a report button wired later", async () => {
    const html = await render({ word: "Testwort" });
    expect(html).toContain("Stimmt wat nich?");
    expect(html).toContain("Wenn dir bei „Testwort“ wat falsch vorkommt, sag Bescheid.");
    expect(html).toMatch(/<button[^>]*type="button"[^>]*data-report/);
    expect(html).toContain("Fehler melden");
  });
});

describe("WordLinks", () => {
  let render: Render;
  beforeAll(async () => {
    render = await load("WordLinks");
  }, 30_000);

  it("is the Und-nu navigation with the three links", async () => {
    const html = await render({ words: [{ berlinerisch: "Eins", slug: "eins" }] });
    expect(html).toContain('aria-label="Und nu?"');
    for (const text of ["Zufälliges Wort", "Wort-Index", "Wort vorschlagen"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain('href="/wort"');
    expect(html).toContain('href="/wort-vorschlagen"');
  });
});

describe("WordMobileBar", () => {
  let render: Render;
  beforeAll(async () => {
    render = await load("WordMobileBar");
  }, 30_000);

  it("jumps to the poll anchor and offers Anhören only with audio", async () => {
    const withAudio = await render({ audio: "https://example.test/a.mp3", wordId: 1 });
    expect(withAudio).toContain('href="#sagste"');
    expect(withAudio).toContain("Sagste det noch?");
    expect(withAudio).toContain("Anhören");
    expect(withAudio).toContain('data-src="https://example.test/a.mp3"');
    const without = await render({});
    expect(without).toContain('href="#sagste"');
    expect(without).not.toContain("Anhören");
  });
});

describe("WordLinks random pick", () => {
  it("never picks the current word", async () => {
    const render = await load("WordLinks");
    for (let i = 0; i < 20; i++) {
      const html = await render({
        excludeSlug: "eins",
        words: [
          { berlinerisch: "Eins", slug: "eins" },
          { berlinerisch: "Zwei", slug: "zwei" },
        ],
      });
      expect(html).toContain('data-content-target="/wort/zwei"');
    }
  });
});

describe("FooterCalloutBook", () => {
  let render: Render;
  beforeAll(async () => {
    render = await createAstroRender(
      (await import("@components/footer/FooterCalloutBook.astro")).default,
    );
  }, 30_000);

  it("shows the book with its affiliate link and disclosure", async () => {
    const html = await render({
      book: {
        disclosure: "CMS-Hinweis zum Partnerlink.",
        title: "Testbuch",
        url: "https://example.test/b",
      },
    });
    expect(html).toContain("Mehr Berlinerisch zum Blättern");
    expect(html).toContain("Testbuch");
    expect(html).toContain('href="https://example.test/b"');
    expect(html).toContain('rel="sponsored noopener noreferrer"');
    expect(html).toContain("data-book-link");
    expect(html).toContain("Bei example.test ansehen");
    expect(html).toContain("CMS-Hinweis zum Partnerlink.");
    expect(html).not.toContain("Amazon");
  });

  it("names Amazon only for an Amazon link and shows no disclosure without one", async () => {
    const amazon = await render({ book: { title: "T", url: "https://www.amazon.de/dp/X" } });
    expect(amazon).toContain("Bei Amazon ansehen");
    const plain = await render({ book: { title: "T", url: "https://example.test/b" } });
    expect(plain).not.toContain("disclosure");
  });

  it("renders no link for a hostile url", async () => {
    const html = await render({ book: { title: "T", url: "javascript:alert(1)" } });
    expect(html).not.toContain("javascript:");
  });
  it("lists further books with or without cover and note, and skips hostile ones", async () => {
    const html = await render({
      book: {
        cover: "https://example.test/c.jpg",
        more: [
          {
            cover: "https://example.test/m.jpg",
            note: "Eine Notiz",
            title: "Mehr eins",
            url: "https://example.test/1",
          },
          { title: "Mehr zwei", url: "https://example.test/2" },
          { title: "Böse", url: "javascript:alert(1)" },
        ],
        title: "T",
        url: "https://example.test/b",
      },
    });
    expect(html).toContain("Ooch jut");
    expect(html).toContain("Mehr eins");
    expect(html).toContain("Eine Notiz");
    expect(html).toContain("https://example.test/m.jpg");
    expect(html).toContain("Mehr zwei");
    expect(html).not.toContain("Böse");
    expect(html).toContain("https://example.test/c.jpg");
  });
});
