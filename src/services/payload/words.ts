import type { Media, Theman, Word as PayloadWord, WordType } from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient, mediaUrl } from "@services/payload.ts";
import { toSeoData, wpDate } from "@services/payload/seo.ts";
import { SHOW_TEST_DATA } from "astro:env/client";
import { escapeHtml, lexicalToHtml } from "payload-app/lexical-html";

import type { AudioRow, Word, WordImage } from "@/types/cms.ts";

const PAGE_SIZE = 1000;

const populated = <T extends object>(items: readonly (T | number)[] | null | undefined): T[] =>
  (items ?? []).filter((item): item is T => typeof item === "object");

const audioRows = (rows: PayloadWord["berlinerischAudio"]): AudioRow[] =>
  (rows ?? []).map((row) => {
    const url = mediaUrl(row.audio);
    return { audio: url ? { node: { mediaItemUrl: url } } : null, gender: row.gender ?? null };
  });

const toImage = (media: Media): WordImage => ({
  altText: media.alt ?? null,
  caption: media.caption ? escapeHtml(media.caption) : null,
  description: lexicalToHtml(media.description) || null,
  mediaDetails: { height: media.height ?? null, width: media.width ?? null },
  sourceUrl: mediaUrl(media) ?? null,
});

/** `doc` must be populated one level deep (relations and media are objects, not ids) and have a slug. */
export const toWord = (doc: PayloadWord & { slug: string }): Word => ({
  berlinerWordId: doc.berlinerWordId ?? 0,
  berlinerischThemen: {
    nodes: populated<Theman>(doc.themen).map((t) => ({
      name: t.name ?? null,
      slug: t.slug ?? null,
    })),
  },
  berlinerischWordTypes: {
    nodes: populated<WordType>(doc.wordTypes).map((t) => ({ name: t.name })),
  },
  dateGmt: wpDate(doc.publishedAt),
  derived: doc.derived
    ? {
        characterLength: doc.derived.characterLength ?? null,
        consonantsCount: doc.derived.consonantsCount ?? null,
        nlpTags: doc.derived.nlpTags ?? null,
        soundexCode: doc.derived.soundexCode ?? null,
        syllablesCount: doc.derived.syllablesCount ?? null,
        vowelsCount: doc.derived.vowelsCount ?? null,
        wordComponents: doc.derived.wordComponents ?? null,
        wordGroup: doc.derived.wordGroup ?? null,
      }
    : null,
  id: String(doc.id),
  modifiedGmt: wpDate(doc.contentModifiedAt),
  seo: toSeoData(doc.seo),
  slug: doc.slug,
  title: doc.berlinerisch,
  translations: (doc.translations ?? []).map((t) => t.translation).filter((t): t is string => !!t),
  wordGroup: doc.derived?.wordGroup ?? null,
  wordProperties: {
    alternativeWords: (doc.alternativeWords ?? []).map((a) => ({
      alternativeWord: a.alternativeWord ?? null,
    })),
    article: doc.article ?? null,
    berlinerisch: doc.berlinerisch,
    berlinerischAudio: audioRows(doc.berlinerischAudio),
    berolinismus: doc.berolinismus ?? null,
    examples: (doc.examples ?? []).map((e) => ({
      example: e.example ?? null,
      exampleAudio: audioRows(e.exampleAudio),
      exampleExplanation: e.exampleExplanation ?? null,
    })),
    images: { nodes: populated<Media>(doc.images).map(toImage) },
    infoText: lexicalToHtml(doc.infoText) || null,
    learnMore: doc.learnMore ?? null,
    relatedWords: {
      nodes: populated<PayloadWord>(doc.relatedWords).map((w) => ({
        id: String(w.id),
        slug: w.slug ?? null,
        wordProperties: { berlinerisch: w.berlinerisch },
      })),
    },
    sources: doc.sources?.length ? [{ quelle: doc.sources }] : [],
    translations: (doc.translations ?? []).map((t) => ({ translation: t.translation ?? null })),
    wikimediaFiles: (doc.wikimediaFiles ?? []).map((f) => ({
      caption: f.caption ?? null,
      description: f.description ?? null,
      wikimediaFile: f.wikimediaFile ?? null,
    })),
  },
});

const loadAllWords = async (): Promise<Word[]> => {
  const payload = await getPayloadClient();
  const docs: PayloadWord[] = [];
  for (let page = 1; ; page++) {
    // oxlint-disable-next-line no-await-in-loop -- sequential pages keep the memory and DB load flat
    const result = await payload.find({
      collection: "words",
      depth: 1,
      limit: PAGE_SIZE,
      page,
      sort: "id",
      ...(SHOW_TEST_DATA ? { draft: true } : { where: { _status: { equals: "published" } } }),
    });
    docs.push(...result.docs);
    if (!result.hasNextPage) break;
  }

  const words = docs.flatMap((doc) => {
    if (!doc.slug) {
      console.warn(
        `[fetchAllWords] Word without slug skipped: id ${doc.id}, berlinerisch "${doc.berlinerisch}"`,
      );
      return [];
    }
    return [toWord({ ...doc, slug: doc.slug })];
  });
  // German collation here, not the database's: the neighbor sections depend on this order.
  return words.sort((a, b) =>
    a.wordProperties.berlinerisch.localeCompare(b.wordProperties.berlinerisch, "de"),
  );
};

/** All public words (plus drafts with SHOW_TEST_DATA), memoized for a minute: an admin edit is live without a rebuild. */
export const fetchAllWords = ttl(60_000, loadAllWords);
