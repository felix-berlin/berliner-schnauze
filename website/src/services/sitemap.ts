import { fetchAllPosts } from "@services/payload/posts.ts";
import { fetchAllThemen } from "@services/payload/themen.ts";
import { fetchAllWords } from "@services/payload/words.ts";
import { getCollection } from "astro:content";
import { docPath } from "payload-app/routes";

export type SitemapEntry = { lastmod?: string; loc: string };

// Settings pages, the BON share route and the Anki checkout thank-you page stay out on purpose.
const STATIC_PATHS = [
  "/",
  "/anki",
  "/changelog",
  "/datenschutz",
  "/games/berliner-oder-nicht",
  "/impressum",
  "/magazin",
  "/spenden",
  "/technischer-changelog",
  "/themen",
  "/wort",
  "/wort-vorschlagen",
];

const isoDate = (date: string | null | undefined): string | undefined => {
  const time = date ? Date.parse(date) : Number.NaN;
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
};

export const buildSitemapEntries = async (site: URL): Promise<SitemapEntry[]> => {
  const [words, posts, themen, changelogs] = await Promise.all([
    fetchAllWords(),
    fetchAllPosts(),
    fetchAllThemen(),
    getCollection("changelogs"),
  ]);

  const entries: { lastmod?: string; path: string }[] = [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...changelogs.map((c) => ({ path: `/changelog/${c.data.version}` })),
    ...themen.map((t) => ({ path: docPath("themen", t.slug) })),
    ...posts.map((p) => ({
      lastmod: isoDate(p.contentModifiedAt),
      path: docPath("posts", p.slug),
    })),
    ...words.map((w) => ({
      lastmod: isoDate(w.contentModifiedAt),
      path: docPath("words", w.slug),
    })),
  ];

  return entries.map(({ lastmod, path }) => {
    const loc = new URL(path, site).toString();
    return lastmod ? { lastmod, loc } : { loc };
  });
};

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

export const renderSitemap = (entries: SitemapEntry[]): string =>
  `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries
    .map(
      (e) =>
        `<url><loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`,
    )
    .join("")}</urlset>`;

export const renderSitemapIndex = (site: URL): string =>
  `${XML_HEADER}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${escapeXml(new URL("/sitemap-0.xml", site).toString())}</loc></sitemap></sitemapindex>`;
