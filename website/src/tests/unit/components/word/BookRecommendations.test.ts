// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";

import { createAstroRender } from "../../helpers";

const book = (overrides: Record<string, unknown> = {}) => ({
  badge: "Neu",
  badgeModifier: "new",
  description: "Berlinerisch für Anfänger",
  href: "https://www.amazon.de/dp/123",
  imageAlt: null,
  imageUrl: null,
  title: "Icke & Berlin",
  ...overrides,
});

const disclaimers = [
  { plattform: "Amazon", text: "Als Amazon-Partner verdiene ich an qualifizierten Verkäufen." },
  { plattform: "thalia.de", text: "Thalia-Partnerlink." },
];

describe("BookRecommendations.astro", () => {
  let render: (props: Record<string, unknown>) => Promise<string>;

  beforeAll(async () => {
    const { default: BookRecommendations } =
      await import("@components/word/BookRecommendations.astro");
    render = await createAstroRender(BookRecommendations);
  }, 30_000);

  it("labels Amazon links as paid and shows only the Amazon disclaimer", async () => {
    const result = await render({ books: [book()], disclaimers });
    expect(result).toContain("Icke &amp; Berlin");
    expect(result).toContain("c-book-recs__badge--new");
    expect(result).toContain("Amazon.de");
    expect(result).toContain("(bezahlter Link)");
    expect(result).toContain("Als Amazon-Partner");
    expect(result).not.toContain("Thalia-Partnerlink.");
  });

  it("shows the hostname for other platforms and matches their disclaimer", async () => {
    const result = await render({
      books: [book({ href: "https://www.thalia.de/buch/1" })],
      disclaimers,
    });
    expect(result).toContain(">thalia.de<");
    expect(result).not.toContain("(bezahlter Link)");
    expect(result).toContain("Thalia-Partnerlink.");
    expect(result).not.toContain("Als Amazon-Partner");
  });

  it("renders no platform for a missing or invalid link", async () => {
    const result = await render({
      books: [book({ href: null }), book({ href: "not a url", title: "Kaputt" })],
      disclaimers,
    });
    expect(result).not.toContain("(bezahlter Link)");
    expect(result).toMatch(/c-book-recs__platform">\s*<\/span>/);
  });

  it("renders a cover picture when an image is set, else the book icon", async () => {
    const withCover = await render({
      books: [book({ imageAlt: "Cover", imageUrl: "https://m.media-amazon.com/cover.jpg" })],
      disclaimers: [],
    });
    expect(withCover).toContain("<picture");
    expect(withCover).toContain('alt="Cover"');

    const withoutCover = await render({ books: [book()], disclaimers: [] });
    expect(withoutCover).not.toContain("<picture");
    expect(withoutCover).toContain("icon-lucide-book-open");
  });
});
