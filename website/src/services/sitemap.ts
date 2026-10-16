import { fetchAllPosts, fetchAllThemen, fetchAllWords } from "@services/api.ts";
import { wpDateMs } from "@utils/wpDate.ts";
import { getCollection } from "astro:content";

export type SitemapEntry = { lastmod?: string; loc: string };

/** Routes that stay out of the sitemap: settings pages, the BON share route and the Anki checkout thank-you page. */
export const sitemapFilter = (path: string): boolean =>
  !path.includes("/settings") &&
  !path.endsWith("/games/berliner-oder-nicht/share") &&
  !path.includes("/anki/danke");

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
  const time = wpDateMs(date);
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
    ...themen.map((t) => ({ path: `/themen/${t.slug}` })),
    ...posts.flatMap((p) =>
      p.slug ? [{ lastmod: isoDate(p.modifiedGmt), path: `/magazin/${p.slug}` }] : [],
    ),
    ...words.map((w) => ({ lastmod: isoDate(w.modifiedGmt), path: `/wort/${w.slug}` })),
  ];

  return entries
    .filter(({ path }) => sitemapFilter(path))
    .map(({ lastmod, path }) => {
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
