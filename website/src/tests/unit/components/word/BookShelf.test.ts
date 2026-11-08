// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

const book = (overrides: Record<string, unknown> = {}) => ({
  badge: "Wörterbuch",
  badgeModifier: "dictionary",
  description: "Berlinerisch für Anfänger",
  href: "https://www.amazon.de/dp/EXAMPLE0001",
  imageAlt: null,
  imageUrl: null,
  title: "Icke & Berlin",
  ...overrides,
});

const disclaimers = [
  { plattform: "Amazon", text: "Als Amazon-Partner verdiene ich an qualifizierten Verkäufen." },
  { plattform: "thalia.de", text: "Thalia-Partnerlink." },
];

describe("BookShelf.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: BookShelf } = await import("@components/word/BookShelf.astro");
    render = await createAstroRender(BookShelf);
  }, 30_000);

  it("renders the band, the ad badge, the Spec copy and a sponsored Amazon CTA", async () => {
    const result = await render({ books: [book()], disclaimers });
    expect(result).toContain('id="buecher"');
    expect(result).toContain("Ooch als Buch zu haben, wa?");
    expect(result).toContain(">Anzeige<");
    expect(result).toContain("Für Berliner &amp; solche, die es werden wollen – zum Nachschlagen, Rätseln und Verschenken.");
    expect(result).toContain("Bezahlte Links zu Amazon.de. Kaufst du darüber, kriegen wa ’ne kleine Provision – für dich bleibt der Preis gleich.");
    expect(result).toMatch(/rel="sponsored noopener noreferrer"/);
    expect(result).toMatch(/Bei Amazon ansehen\s*<span aria-hidden="true">↗<\/span>/);
    expect(result).toContain("Icke &amp; Berlin");
  });

  it("appends only the matching CMS partner statement", async () => {
    const amazon = await render({ books: [book()], disclaimers });
    expect(amazon).toContain("Als Amazon-Partner");
    expect(amazon).not.toContain("Thalia-Partnerlink.");

    const thalia = await render({ books: [book({ href: "https://www.thalia.de/buch/1" })], disclaimers });
    expect(thalia).toContain("Thalia-Partnerlink.");
    expect(thalia).not.toContain("Als Amazon-Partner");
    expect(thalia).toContain("Bei thalia.de ansehen");
  });

  it("renders nothing without books", async () => {
    expect(await render({ books: [], disclaimers })).not.toContain("buecher");
  });

  it("skips books without an http(s) link and caps the shelf at three", async () => {
    const result = await render({
      books: [
        book({ href: "javascript:alert(1)", title: "Boese" }),
        book({ href: null, title: "Ohne" }),
        ...["A", "B", "C", "D"].map((title) => book({ title })),
      ],
      disclaimers: [],
    });
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("Ohne");
    expect(result.match(/class="c-book"/g)).toHaveLength(3);
    expect(result).not.toContain(">D<");
  });

  it("renders a cover picture when an image is set, else the book icon", async () => {
    const withCover = await render({
      books: [book({ imageUrl: "https://m.media-amazon.com/cover.jpg" })],
      disclaimers: [],
    });
    expect(withCover).toContain("<picture");
    const withoutCover = await render({ books: [book()], disclaimers: [] });
    expect(withoutCover).not.toContain("<picture");
    expect(withoutCover).toContain("icon-lucide-book-open");
  });
});
