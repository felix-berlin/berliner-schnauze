import type { Media, Theman, Word as PayloadWord, WordType } from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient, mediaUrl, publicDocs } from "@services/payload.ts";
import { toSeoData } from "@services/payload/seo.ts";
import { wpDate } from "@utils/wpDate.ts";
import { escapeHtml, lexicalToHtml } from "payload-app/lexical-html";

import type { AudioRow, Word, WordImage } from "@/types/cms.ts";

const PAGE_SIZE = 1000;

/**
 * Words imported from WordPress keep their `berlinerWordId` (the DOM id of a card and the word-of-the-day id). A word
 * created in Payload has none and would share one id with every other new word, so it gets one from a range
 * above the WordPress ids (Payload ids start at 1 and would clash with them).
 */
const PAYLOAD_ID_OFFSET = 1_000_000;

/** WPGraphQL returned null for an empty repeater and callers test the fields for truthiness. */
const mapOrNull = <T, R>(items: readonly T[] | null | undefined, f: (item: T) => R): R[] | null =>
  items?.length ? items.map(f) : null;

const populated = <T extends object>(items: readonly (T | number)[] | null | undefined): T[] =>
  (items ?? []).filter((item): item is T => typeof item === "object");

const audioRows = (rows: PayloadWord["berlinerischAudio"]): AudioRow[] | null =>
  mapOrNull(rows, (row) => {
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

const wordDbId = (doc: Pick<PayloadWord, "berlinerWordId" | "id">): number =>
  doc.berlinerWordId ?? PAYLOAD_ID_OFFSET + doc.id;

/** The id a word had in WPGraphQL ("post:<id>" base64): the JSON-LD identifier of a word page stays as it was. */
const wordGlobalId = (doc: Pick<PayloadWord, "berlinerWordId" | "id">): string =>
  btoa(`post:${wordDbId(doc)}`);

/** `doc` must be populated one level deep (relations and media are objects, not ids) and have a slug. */
export const toWord = (doc: PayloadWord & { slug: string }): Word => ({
  berlinerWordId: wordDbId(doc),
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
  id: wordGlobalId(doc),
  modifiedGmt: wpDate(doc.contentModifiedAt),
  seo: toSeoData(doc.meta, "article"),
  slug: doc.slug,
  title: doc.berlinerisch,
  translations: (doc.translations ?? []).map((t) => t.translation).filter((t): t is string => !!t),
  wordGroup: doc.derived?.wordGroup ?? null,
  wordProperties: {
    alternativeWords: mapOrNull(doc.alternativeWords, (a) => ({
      alternativeWord: a.alternativeWord ?? null,
    })),
    article: doc.article ?? null,
    berlinerisch: doc.berlinerisch,
    berlinerischAudio: audioRows(doc.berlinerischAudio),
    berolinismus: doc.berolinismus ?? null,
    examples: mapOrNull(doc.examples, (e) => ({
      example: e.example ?? null,
      exampleAudio: audioRows(e.exampleAudio),
      exampleExplanation: e.exampleExplanation ?? null,
    })),
    images: { nodes: populated<Media>(doc.images).map(toImage) },
    infoText: lexicalToHtml(doc.infoText) || null,
    learnMore: doc.learnMore ?? null,
    relatedWords: {
      // the Local API ignores access control: a never-published word must not leak through a relation
      nodes: populated<PayloadWord>(doc.relatedWords)
        .filter((w) => w._status === "published")
        .map((w) => ({
          id: wordGlobalId(w),
          slug: w.slug ?? null,
          wordProperties: { berlinerisch: w.berlinerisch },
        })),
    },
    sources: doc.sources?.length ? [{ quelle: doc.sources }] : null,
    translations: mapOrNull(doc.translations, (t) => ({ translation: t.translation ?? null })),
    wikimediaFiles: mapOrNull(doc.wikimediaFiles, (f) => ({
      caption: f.caption ?? null,
      description: f.description ?? null,
      wikimediaFile: f.wikimediaFile ?? null,
    })),
  },
});

const loadAllWords = async (): Promise<Word[]> => {
  const payload = await getPayloadClient();
  const words: Word[] = [];
  for (let page = 1; ; page++) {
    // oxlint-disable-next-line no-await-in-loop -- sequential pages keep the memory and DB load flat
    const result = await payload.find({
      collection: "words",
      depth: 1,
      limit: PAGE_SIZE,
      page,
      // relations: only what toWord reads, not every related word in full
      populate: {
        themen: { name: true, slug: true },
        "word-types": { name: true },
        words: { _status: true, berlinerWordId: true, berlinerisch: true, slug: true },
      },
      sort: "id",
      ...publicDocs(),
    });
    for (const doc of result.docs) {
      if (doc.slug) words.push(toWord({ ...doc, slug: doc.slug }));
      else
        console.warn(
          `[fetchAllWords] Word without slug skipped: id ${doc.id}, berlinerisch "${doc.berlinerisch}"`,
        );
    }
    if (!result.hasNextPage) break;
  }

  // German collation here, not the database's: the neighbor sections depend on this order.
  return words.sort((a, b) =>
    a.wordProperties.berlinerisch.localeCompare(b.wordProperties.berlinerisch, "de"),
  );
};

/** All public words (plus drafts with SHOW_TEST_DATA), memoized for a minute: an admin edit is live without a rebuild. */
export const fetchAllWords = ttl(60_000, loadAllWords);
