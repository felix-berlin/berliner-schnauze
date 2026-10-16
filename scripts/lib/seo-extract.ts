import { JSDOM } from "jsdom";

export type SeoSnapshot = {
  canonical: string | null;
  description: string | null;
  /** Parsed JSON-LD blocks; an unparsable block stays raw text. */
  jsonLd: unknown[];
  lang: string | null;
  /** All og:* and twitter:* meta tags. */
  meta: Record<string, string>;
  robots: string | null;
  title: string | null;
};

/** The SEO-relevant head of a page: what a crawler or a link preview reads. */
export function extractSeo(html: string): SeoSnapshot {
  const doc = new JSDOM(html).window.document;
  const content = (selector: string) =>
    doc.querySelector(selector)?.getAttribute("content") ?? null;

  const meta: Record<string, string> = {};
  for (const tag of doc.querySelectorAll(
    "meta[property^='og:'], meta[name^='og:'], meta[name^='twitter:'], meta[property^='twitter:']",
  )) {
    const key = tag.getAttribute("property") ?? tag.getAttribute("name");
    if (key) meta[key] = tag.getAttribute("content") ?? "";
  }

  const jsonLd = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((script) => {
    const raw = script.textContent ?? "";
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  });

  return {
    canonical: doc.querySelector("link[rel='canonical']")?.getAttribute("href") ?? null,
    description: content("meta[name='description']"),
    jsonLd,
    lang: doc.documentElement.getAttribute("lang"),
    meta,
    robots: content("meta[name='robots']"),
    title: doc.querySelector("title")?.textContent?.trim() ?? null,
  };
}

export type SeoDifference = { a: unknown; b: unknown; key: string };

/** Key order must not matter in JSON-LD. */
const canonicalJson = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)))
      : v,
  );

export function diffSeo(
  a: SeoSnapshot,
  b: SeoSnapshot,
  { ignore = [] }: { ignore?: string[] } = {},
): SeoDifference[] {
  const diffs: SeoDifference[] = [];
  const compare = (key: string, x: unknown, y: unknown) => {
    if (!ignore.includes(key) && canonicalJson(x) !== canonicalJson(y))
      diffs.push({ a: x, b: y, key });
  };

  for (const key of ["title", "description", "canonical", "robots", "lang"] as const)
    compare(key, a[key], b[key]);
  for (const key of new Set([...Object.keys(a.meta), ...Object.keys(b.meta)]))
    compare(`meta[${key}]`, a.meta[key], b.meta[key]);
  compare("jsonLd", a.jsonLd, b.jsonLd);
  return diffs;
}

const MEDIA_MOVE: [string, string] = ["/wp-content/uploads/", "/api/media/file/"];
const MEDIA_MOVE_ENCODED: [string, string] = [
  "%2Fwp-content%2Fuploads%2F",
  "%2Fapi%2Fmedia%2Ffile%2F",
];

/** An Imagor url is `<host>/<signature>/<options>/<encoded source>`: the signature depends on the source. */
const normalizeMetaUrl = (value: string): string =>
  value
    .replace(/^(https:\/\/assets\.[^/]+)\/[^/]+\//, "$1/<signature>/")
    .replace(...MEDIA_MOVE)
    .replace(...MEDIA_MOVE_ENCODED);

const walk = (value: unknown, parentKey?: string): unknown => {
  if (typeof value === "string") {
    const moved = value.replace(...MEDIA_MOVE);
    return parentKey === "caption" ? moved.replace(/<[^>]*>/g, "").trim() : moved;
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => walk(v, parentKey));
    // An ItemList's order is not part of its meaning: sort by url, drop the positions.
    type ListItem = { position: unknown; url: unknown } & Record<string, unknown>;
    const isListItem = (i: unknown): i is ListItem =>
      !!i && typeof i === "object" && "url" in i && "position" in i;
    if (items.length && items.every(isListItem)) {
      return items
        .map(({ position: _position, ...rest }) => rest)
        .sort((x, y) => (String(x.url) < String(y.url) ? -1 : 1));
    }
    return items;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !(parentKey === "image" && (key === "width" || key === "height")))
        .map(([key, v]) => [key, walk(v, key)]),
    );
  }
  return value;
};

/**
 * Expected differences of the WordPress -> Payload move, removed from a snapshot before comparing: media urls
 * (old ones are redirected), image dimensions (WordPress reported the original size of a "-scaled" upload),
 * captions (plain text now, not rendered html) and the order of ItemLists.
 */
export const normalizeForMigration = (snapshot: SeoSnapshot): SeoSnapshot => ({
  ...snapshot,
  jsonLd: snapshot.jsonLd.map((block) => walk(block)),
  meta: Object.fromEntries(Object.entries(snapshot.meta).map(([k, v]) => [k, normalizeMetaUrl(v)])),
});
