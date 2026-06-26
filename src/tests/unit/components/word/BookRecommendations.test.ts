// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it, vi } from "vitest";

vi.mock("@styles/components/_book-recommendations.scss", () => ({}));
vi.mock("~icons/lucide/book-open", () => ({ default: {} }));
vi.mock("virtual:icons/lucide/book-open", () => ({ default: {} }));

describe("BookRecommendations.astro", () => {
  async function render() {
    const { default: BookRecommendations } = await import(
      "@components/word/BookRecommendations.astro"
    );
    const container = await AstroContainer.create();
    return container.renderToString(BookRecommendations, {});
  }

  it("renders the aside with c-book-recs class", async () => {
    const result = await render();
    expect(result).toContain("c-book-recs");
    expect(result).toContain("<aside");
  });

  it("renders aria-label for Buchempfehlungen", async () => {
    const result = await render();
    expect(result).toContain("Buchempfehlungen");
  });

  it("renders the heading text", async () => {
    const result = await render();
    expect(result).toContain("Ooch als Buch zu haben");
  });

  it("renders all three book titles", async () => {
    const result = await render();
    expect(result).toContain("Langenscheidt Lilliput Berlinerisch");
    expect(result).toContain("Berlinerisch: Watt denn, icke?");
    expect(result).toContain("Da kiekste, wa?! Dialekt-Quiz");
  });

  it("renders book prices", async () => {
    const result = await render();
    expect(result).toContain("ab 4,81 €");
    expect(result).toContain("ab 8,75 €");
    expect(result).toContain("ab 9,99 €");
  });

  it("renders book badges", async () => {
    const result = await render();
    expect(result).toContain("Wörterbuch");
    expect(result).toContain("Nachschlagewerk");
    expect(result).toContain("Geschenk");
  });

  it("renders the affiliate disclaimer", async () => {
    const result = await render();
    expect(result).toContain("Affiliate-Links");
  });

  it("renders links with target _blank and rel sponsored", async () => {
    const result = await render();
    expect(result).toContain('target="_blank"');
    expect(result).toContain("sponsored");
  });

  it("renders an unordered list for the books", async () => {
    const result = await render();
    expect(result).toContain("c-book-recs__list");
    expect(result).toContain("<ul");
    expect(result).toContain("<li");
  });
});
