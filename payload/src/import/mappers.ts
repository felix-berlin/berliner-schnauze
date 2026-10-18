/** Pure WordPress -> Payload data mapping (no writes). */
import type { SanitizedConfig } from "payload";

import type { Page, Post, SeoMetaGroup, Theman, Word } from "../payload-types";
import type { AudioRow, Maybe, WpBlock, WpImage, WpPage, WpPost, WpSeo, WpThema, WpWord } from "./wp";

import { isWpUploadUrl, wpUploadPath } from "../lib/wpUploadPath";
import { htmlToLexical, htmlToText, imagesIn, type RichText } from "./html";

export type ImportRefs = {
  /** Keyed by `wpUploadPath(url)`. */
  mediaIdByUrl: Map<string, number>;
  wordTypeIdByName: Map<string, number>;
  themaIdBySlug: Map<string, number>;
  wordIdByWpId: Map<number, number>;
};

/**
 * Images the frontend hard-codes by their WordPress url (hero and footer art): no content references them, so
 * they are imported explicitly and the old urls keep redirecting once WordPress is gone.
 */
export const SITE_ASSET_FILES = ["brown-bear-roar.png", "bear-walking.png"];

export type MediaMeta = { url: string; alt?: string | null; caption?: string | null; description?: string | null };

const present = <T>(v: Maybe<T>): v is T => v != null;

/** WP `*Gmt` ("2025-04-09T12:18:58", no zone) -> ISO string; null when empty/invalid. */
export const gmtToIso = (gmt: Maybe<string>): string | null => {
  const d = gmt ? new Date(`${gmt}Z`) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};

/** WPGraphQL `status` is "publish"/"draft"/...; everything but publish stays a draft. */
export const statusOf = (status: Maybe<string>): "published" | "draft" =>
  status?.toLowerCase() === "publish" ? "published" : "draft";

const mediaId = (url: Maybe<string>, refs: ImportRefs) => (url ? (refs.mediaIdByUrl.get(wpUploadPath(url)) ?? null) : null);

/**
 * Every media file referenced by the content (audio, word images, featured and OG images),
 * deduplicated by upload path. The first occurrence's metadata wins.
 */
export function collectMedia(words: WpWord[], posts: WpPost[], pages: WpPage[], themen: WpThema[]): Map<string, MediaMeta> {
  const media = new Map<string, MediaMeta>();
  const add = (url: Maybe<string>, meta: Omit<MediaMeta, "url"> = {}) => {
    if (url && !media.has(wpUploadPath(url))) media.set(wpUploadPath(url), { url, ...meta });
  };
  /** `<img>` in HTML that will be converted (only WP uploads can be imported). */
  const addHtml = (html: Maybe<string>) => {
    for (const { src, alt } of html ? imagesIn(html) : []) if (isWpUploadUrl(src)) add(src, { alt });
  };
  const addImage = (img: Maybe<WpImage>) =>
    add(img?.sourceUrl, { alt: img?.altText || null, caption: htmlToText(img?.caption ?? "") || null, description: img?.description?.trim() || null });

  for (const w of words) {
    const p = w.wordProperties;
    for (const row of p?.berlinerischAudio ?? []) add(row?.audio?.node?.mediaItemUrl);
    for (const ex of p?.examples ?? []) for (const row of ex?.exampleAudio ?? []) add(row?.audio?.node?.mediaItemUrl);
    for (const img of p?.images?.nodes ?? []) addImage(img);
    add(w.seo?.opengraphImage?.sourceUrl);
    addHtml(p?.infoText);
  }
  for (const post of posts) {
    addImage(post.featuredImage?.node);
    for (const b of post.blocks ?? []) {
      if (b?.name === "core/image") add(b.attributes?.url, { alt: b.attributes?.alt || null });
      addHtml(b?.saveContent);
    }
    add(post.seo?.opengraphImage?.sourceUrl);
  }
  for (const n of [...pages, ...themen]) add(n.seo?.opengraphImage?.sourceUrl);
  for (const page of pages) addHtml(page.content);
  return media;
}

/** Yoast robots value ("index", "noindex", "noindex, follow", ...) contains `flag`. */
const robots = (value: Maybe<string>, flag: string) => !!value?.trim().toLowerCase().includes(flag);

/** Yoast SEO -> `seo` group. Empty or missing values become null/false so a re-import clears them. */
/** Yoast set every canonical to the page's own URL on the WordPress host: that is no override, the site uses its own URL. */
const OLD_CMS_ORIGIN = /^https:\/\/cms\.berliner-schnauze\.wtf(\/|$)/;

export function mapSeo(seo: Maybe<WpSeo>, refs: ImportRefs): SeoMetaGroup {
  seo ??= {};
  return {
    title: seo.title || null,
    // Without a meta description Yoast generated og:description from the content; the site renders it as both.
    description: seo.metaDesc || seo.opengraphDescription || null,
    canonical: seo.canonical && !OLD_CMS_ORIGIN.test(seo.canonical) ? seo.canonical : null,
    image: mediaId(seo.opengraphImage?.sourceUrl, refs),
    noindex: robots(seo.metaRobotsNoindex, "noindex"),
    nofollow: robots(seo.metaRobotsNofollow, "nofollow"),
  };
}

/**
 * Called for every reference of a word that resolves to nothing (media not imported: download failed, foreign host,
 * `--only words`; unknown term): the word is stored without it.
 */
export type OnMissingRef = (kind: "missing-media" | "missing-term", src: string) => void;

type AudioRows = NonNullable<Word["berlinerischAudio"]>;
const mapAudio = (rows: Maybe<Maybe<AudioRow>[]>, refs: ImportRefs, onMissing?: OnMissingRef): AudioRows =>
  (rows ?? []).filter(present).flatMap((row) => {
    const url = row.audio?.node?.mediaItemUrl;
    const audio = mediaId(url, refs);
    if (audio == null) {
      if (url) onMissing?.("missing-media", url);
      return [];
    }
    const gender = row.gender === "male" || row.gender === "female" ? row.gender : null;
    return [{ gender, audio }];
  });

/** Called with the src of every `<img>` that could not be mapped to media (it became a link). */
export type OnUnmappedImage = (src: string) => void;

const htmlOrNull = async (html: Maybe<string>, config: SanitizedConfig, refs: ImportRefs, onUnmappedImage?: OnUnmappedImage) =>
  html?.trim() ? htmlToLexical(html, config, { mediaIdByUrl: refs.mediaIdByUrl, onUnmappedImage }) : null;

export type WordData = Omit<Word, "id" | "derived" | "relatedWords" | "createdAt" | "updatedAt">;

export async function mapWord(node: WpWord, refs: ImportRefs, config: SanitizedConfig, onUnmappedImage?: OnUnmappedImage, onMissing?: OnMissingRef): Promise<WordData> {
  const p = node.wordProperties ?? {};
  /** `lookup(key)`, reported when a present key resolves to nothing. */
  const resolve = (kind: Parameters<OnMissingRef>[0], key: Maybe<string>, lookup: (key: string) => Maybe<number>): number[] => {
    if (!key) return [];
    const id = lookup(key);
    if (id == null) onMissing?.(kind, key);
    return id == null ? [] : [id];
  };
  return {
    wpId: node.databaseId,
    slug: node.slug || null,
    berlinerisch: p.berlinerisch ?? "",
    article: p.article ?? null,
    translations: (p.translations ?? []).filter(present).map(({ translation }) => ({ translation: translation ?? null })),
    alternativeWords: (p.alternativeWords ?? []).filter(present).map(({ alternativeWord }) => ({ alternativeWord: alternativeWord ?? null })),
    examples: (p.examples ?? []).filter(present).map((ex) => ({
      example: ex.example ?? null,
      exampleExplanation: ex.exampleExplanation ?? null,
      exampleAudio: mapAudio(ex.exampleAudio, refs, onMissing),
    })),
    berlinerischAudio: mapAudio(p.berlinerischAudio, refs, onMissing),
    wikimediaFiles: (p.wikimediaFiles ?? []).filter(present).map((f) => ({
      wikimediaFile: f.wikimediaFile ?? null,
      description: f.description ?? null,
      caption: f.caption ?? null,
    })),
    infoText: await htmlOrNull(p.infoText, config, refs, onUnmappedImage),
    learnMore: p.learnMore ?? null,
    berolinismus: p.berolinismus ?? false,
    // ACF repeater of `quelle` fields, each a string or a list of strings.
    sources: (p.sources ?? []).flatMap((s) => [s?.quelle ?? []].flat()).filter((s): s is string => !!s),
    images: (p.images?.nodes ?? []).flatMap((img) => resolve("missing-media", img?.sourceUrl, (url) => mediaId(url, refs))),
    wordTypes: (node.berlinerischWordTypes?.nodes ?? []).flatMap((t) => resolve("missing-term", t?.name, (name) => refs.wordTypeIdByName.get(name))),
    themen: (node.berlinerischThemen?.nodes ?? []).flatMap((t) => resolve("missing-term", t?.slug, (slug) => refs.themaIdBySlug.get(slug))),
    publishedAt: gmtToIso(node.dateGmt),
    contentModifiedAt: gmtToIso(node.modifiedGmt),
    meta: mapSeo(node.seo, refs),
    _status: statusOf(node.status),
  };
}

/** Pass 2: related word ids; links to words that were not imported are dropped and counted. */
export function mapRelatedWords(node: WpWord, refs: ImportRefs): { ids: number[]; missing: number } {
  const ids: number[] = [];
  let missing = 0;
  for (const rel of node.wordProperties?.relatedWords?.nodes ?? []) {
    const id = rel?.databaseId == null ? undefined : refs.wordIdByWpId.get(rel.databaseId);
    if (id == null) missing++;
    else ids.push(id);
  }
  return { ids, missing };
}

/** Upload node for a media id, as Payload's Lexical upload feature stores it. */
const uploadNode = (value: number) => ({ type: "upload", relationTo: "media", value, version: 3, format: "", fields: null });

/** Gutenberg blocks in `order`: runs of non-image blocks are converted together, images become upload nodes. */
export async function blocksToLexical(blocks: Maybe<WpBlock>[], refs: ImportRefs, config: SanitizedConfig, onUnmappedImage?: OnUnmappedImage): Promise<RichText | null> {
  const sorted = blocks.filter(present).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (!sorted.length) return null;
  const children: RichText["root"]["children"] = [];
  let html: string[] = [];
  const flush = async () => {
    if (html.join("").trim()) children.push(...(await htmlToLexical(html.join("\n"), config, { mediaIdByUrl: refs.mediaIdByUrl, onUnmappedImage })).root.children);
    html = [];
  };
  for (const block of sorted) {
    const id = block.name === "core/image" ? mediaId(block.attributes?.url, refs) : null;
    if (id == null) {
      // An image block whose download failed keeps its HTML; htmlToLexical turns the <img> into a link.
      html.push(block.saveContent ?? "");
      continue;
    }
    await flush();
    children.push(uploadNode(id));
  }
  await flush();
  return { root: { type: "root", children, direction: "ltr", format: "", indent: 0, version: 1 } };
}

export type PostData = Omit<Post, "id" | "createdAt" | "updatedAt">;

export async function mapPost(node: WpPost, refs: ImportRefs, config: SanitizedConfig, onUnmappedImage?: OnUnmappedImage): Promise<PostData> {
  return {
    wpId: node.databaseId,
    slug: node.slug || null,
    title: node.title ?? "",
    excerpt: node.excerpt ? htmlToText(node.excerpt) : null,
    publishedAt: gmtToIso(node.dateGmt),
    contentModifiedAt: gmtToIso(node.modifiedGmt),
    featuredImage: mediaId(node.featuredImage?.node?.sourceUrl, refs),
    content: await blocksToLexical(node.blocks ?? [], refs, config, onUnmappedImage),
    meta: mapSeo(node.seo, refs),
    _status: statusOf(node.status),
  };
}

export async function mapPage(
  node: WpPage,
  refs: ImportRefs,
  config: SanitizedConfig,
  onUnmappedImage?: OnUnmappedImage,
): Promise<Omit<Page, "id" | "createdAt" | "updatedAt">> {
  return {
    wpId: node.databaseId,
    slug: node.slug || null,
    title: node.title ?? "",
    content: await htmlOrNull(node.content, config, refs, onUnmappedImage),
    meta: mapSeo(node.seo, refs),
  };
}

export const mapThema = (node: WpThema, refs: ImportRefs): Omit<Theman, "id" | "createdAt" | "updatedAt"> => ({
  wpId: node.databaseId,
  slug: node.slug || null,
  name: node.name ?? "",
  description: node.description || null,
  meta: mapSeo(node.seo, refs),
});
