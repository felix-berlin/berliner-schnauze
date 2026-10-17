import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAllWords, fetchAllPosts, fetchAllThemen, getCollection } = vi.hoisted(() => ({
  fetchAllPosts: vi.fn(),
  fetchAllThemen: vi.fn(),
  fetchAllWords: vi.fn(),
  getCollection: vi.fn(),
}));
vi.mock("@services/api.ts", () => ({ fetchAllPosts, fetchAllThemen, fetchAllWords }));
vi.mock("astro:content", () => ({ getCollection }));

import {
  buildSitemapEntries,
  renderSitemap,
  renderSitemapIndex,
  sitemapFilter,
} from "@services/sitemap.ts";

const SITE = new URL("https://berliner-schnauze.wtf");

// Every non-word path of the production sitemap before the cutover.
const baseline = readFileSync(new URL("../fixtures/sitemap-baseline.txt", import.meta.url), "utf8")
  .split("\n")
  .filter((line) => line && !line.startsWith("#"));
const baselineVersions = baseline
  .filter((p) => p.startsWith("/changelog/"))
  .map((p) => p.replace("/changelog/", ""));

beforeEach(() => {
  fetchAllWords.mockResolvedValue([
    { contentModifiedAt: "2026-09-20T17:24:19.000Z", slug: "aasen" },
    { contentModifiedAt: null, slug: "wa" },
  ]);
  fetchAllPosts.mockResolvedValue([
    {
      date: "2025-05-01T10:00:00",
      modifiedGmt: "2026-01-02T03:04:05",
      slug: "berlinerische-woerter-herkunft",
    },
  ]);
  fetchAllThemen.mockResolvedValue([{ slug: "alkohol-kneipe" }]);
  getCollection.mockResolvedValue(baselineVersions.map((version) => ({ data: { version } })));
});

describe("buildSitemapEntries", () => {
  it("covers every url the production sitemap listed apart from the words", async () => {
    const paths = new Set((await buildSitemapEntries(SITE)).map((e) => new URL(e.loc).pathname));
    const missing = baseline.filter(
      (p) => p !== "/themen/alkohol-kneipe" && !p.startsWith("/themen/") && !paths.has(p),
    );
    expect(missing).toEqual([]);
  });

  it("adds words with their modified date as an ISO lastmod, and leaves it out when unknown", async () => {
    const entries = await buildSitemapEntries(SITE);
    expect(entries).toContainEqual({
      lastmod: "2026-09-20T17:24:19.000Z",
      loc: "https://berliner-schnauze.wtf/wort/aasen",
    });
    expect(entries).toContainEqual({ loc: "https://berliner-schnauze.wtf/wort/wa" });
  });

  it("dates a post by its modified date (UTC), not by the Berlin-local publish date", async () => {
    const entries = await buildSitemapEntries(SITE);
    expect(entries).toContainEqual({
      lastmod: "2026-01-02T03:04:05.000Z",
      loc: "https://berliner-schnauze.wtf/magazin/berlinerische-woerter-herkunft",
    });
  });

  it("adds posts and themen, skipping themen without a slug", async () => {
    const locs = (await buildSitemapEntries(SITE)).map((e) => e.loc);
    expect(locs).toContain("https://berliner-schnauze.wtf/magazin/berlinerische-woerter-herkunft");
    expect(locs).toContain("https://berliner-schnauze.wtf/themen/alkohol-kneipe");
    expect(locs.filter((l) => l.includes("/themen/"))).toHaveLength(1);
  });

  it("never lists settings, the BON share route or the Anki thank-you page", async () => {
    const locs = (await buildSitemapEntries(SITE)).map((e) => e.loc).join("\n");
    expect(locs).not.toMatch(/\/settings|\/games\/berliner-oder-nicht\/share|\/anki\/danke/);
  });

  it("uses the site origin it is given", async () => {
    const entries = await buildSitemapEntries(new URL("http://localhost:4321"));
    expect(entries.every((e) => e.loc.startsWith("http://localhost:4321/"))).toBe(true);
  });
});

describe("renderSitemap", () => {
  it("renders a urlset with escaped locations", () => {
    const xml = renderSitemap([
      { lastmod: "2026-01-01T00:00:00.000Z", loc: "https://x.example/a?b=1&c=2" },
      { loc: "https://x.example/b" },
    ]);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(
      "<url><loc>https://x.example/a?b=1&amp;c=2</loc><lastmod>2026-01-01T00:00:00.000Z</lastmod></url>",
    );
    expect(xml).toContain("<url><loc>https://x.example/b</loc></url>");
  });
});

describe("renderSitemapIndex", () => {
  it("points at the single sitemap", () => {
    expect(renderSitemapIndex(SITE)).toContain(
      "<sitemap><loc>https://berliner-schnauze.wtf/sitemap-0.xml</loc></sitemap>",
    );
  });
});

describe("sitemapFilter", () => {
  it("keeps word, magazine, themen and static routes", () => {
    for (const p of ["/wort/aalen", "/magazin/some-article", "/themen/kiez", "/anki"])
      expect(sitemapFilter(p)).toBe(true);
  });

  it.each(["/anki/danke", "/settings", "/settings/cache", "/games/berliner-oder-nicht/share"])(
    "drops %s",
    (p) => {
      expect(sitemapFilter(p)).toBe(false);
    },
  );
});
