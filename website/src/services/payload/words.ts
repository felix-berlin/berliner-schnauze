import type {
  AudioArray,
  Media,
  Theman,
  Word as PayloadWord,
  WordExamplesArray,
  WordType,
} from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient, mediaUrl, publicDocs } from "@services/payload.ts";
import { lexicalToHtml } from "payload-app/lexical-html";

const PAGE_SIZE = 1000;

/** A media doc as the site renders it: absolute url, rich-text description as HTML. */
export type SiteMedia = Pick<Media, "alt" | "caption" | "height" | "id" | "mimeType" | "width"> & {
  descriptionHtml: string | null;
  url: string;
};

// Generated row types (`interfaceName` in payload/src/collections/Words.ts) with the upload narrowed to SiteMedia.
export type AudioRow = Omit<NonNullable<AudioArray>[number], "audio"> & { audio: SiteMedia };
export type WordExample = Omit<NonNullable<WordExamplesArray>[number], "exampleAudio"> & {
  exampleAudio: AudioRow[];
};
export type RelatedWord = Pick<PayloadWord, "berlinerisch" | "id"> & { slug: string };

/**
 * A public word as the pages render it: the Payload doc with its relations populated, repeaters as arrays
 * (never null), media with absolute urls, and what is computed once per cache window (rich text as HTML).
 */
export type SiteWord = Omit<
  PayloadWord,
  | "berlinerischAudio"
  | "examples"
  | "images"
  | "infoText"
  | "relatedWords"
  | "slug"
  | "themen"
  | "wordTypes"
> & {
  berlinerischAudio: AudioRow[];
  examples: WordExample[];
  images: SiteMedia[];
  infoTextHtml: string | null;
  relatedWords: RelatedWord[];
  slug: string;
  themen: Pick<Theman, "id" | "name" | "slug">[];
  wordTypes: Pick<WordType, "id" | "name">[];
};

const populated = <T extends object>(items: readonly (T | number | null)[] | null | undefined): T[] =>
  (items ?? []).filter((item): item is T => typeof item === "object" && item !== null);

export const toSiteMedia = (media: Media): SiteMedia | null => {
  const url = mediaUrl(media);
  return url
    ? {
        alt: media.alt,
        caption: media.caption,
        descriptionHtml: lexicalToHtml(media.description) || null,
        height: media.height,
        id: media.id,
        mimeType: media.mimeType,
        url,
        width: media.width,
      }
    : null;
};

const audioRows = (rows: AudioArray | undefined): AudioRow[] =>
  (rows ?? []).flatMap(({ audio, ...row }) => {
    const media = typeof audio === "object" && audio ? toSiteMedia(audio) : null;
    return media ? [{ ...row, audio: media }] : [];
  });

/** `doc` must be populated one level deep (relations and media are objects, not ids) and have a slug. */
export const toWord = ({
  berlinerischAudio,
  examples,
  images,
  infoText,
  relatedWords,
  themen,
  wordTypes,
  ...doc
}: PayloadWord & { slug: string }): SiteWord => ({
  ...doc,
  berlinerischAudio: audioRows(berlinerischAudio),
  examples: (examples ?? []).map(({ exampleAudio, ...e }) => (Object.assign(e, { exampleAudio: audioRows(exampleAudio) }))),
  images: populated<Media>(images).flatMap((m) => toSiteMedia(m) ?? []),
  infoTextHtml: lexicalToHtml(infoText) || null,
  // the Local API ignores access control: a never-published word must not leak through a relation
  relatedWords: populated<PayloadWord>(relatedWords).flatMap((w) =>
    w._status === "published" && w.slug ? [{ berlinerisch: w.berlinerisch, id: w.id, slug: w.slug }] : [],
  ),
  themen: populated<Theman>(themen).map(({ id, name, slug }) => ({ id, name, slug })),
  wordTypes: populated<WordType>(wordTypes).map(({ id, name }) => ({ id, name })),
});

/** The translations of a word as plain strings, empty rows dropped. */
export const translationTexts = (word: Pick<SiteWord, "translations">): string[] =>
  (word.translations ?? []).flatMap((t) => t.translation || []);

// Relations: only what toWord reads, not every related word in full.
const WORD_POPULATE = {
  themen: { name: true, slug: true },
  "word-types": { name: true },
  words: { _status: true, berlinerisch: true, slug: true },
} as const;

/** A stored word as a SiteWord, or undefined when it lacks what a page needs (a draft may). */
const toSiteWord = (doc: PayloadWord): SiteWord | undefined => {
  // strictDraftTypes types the required fields of a draft optional.
  const { berlinerisch, createdAt, slug, updatedAt } = doc;
  if (slug && berlinerisch && createdAt && updatedAt)
    return toWord({ ...doc, berlinerisch, createdAt, slug, updatedAt });
  console.warn(`[words] Word without slug or headword skipped: id ${doc.id}, berlinerisch "${berlinerisch}"`);
  return undefined;
};

const loadAllWords = async (): Promise<SiteWord[]> => {
  const payload = await getPayloadClient();
  const words: SiteWord[] = [];
  for (let page = 1; ; page++) {
    // oxlint-disable-next-line no-await-in-loop -- sequential pages keep the memory and DB load flat
    const result = await payload.find({
      collection: "words",
      depth: 1,
      limit: PAGE_SIZE,
      page,
      populate: WORD_POPULATE,
      sort: "id",
      ...publicDocs(),
    });
    for (const doc of result.docs) {
      const word = toSiteWord(doc);
      if (word) words.push(word);
    }
    if (!result.hasNextPage) break;
  }

  // German collation here, not the database's: the neighbor sections depend on this order.
  return words.sort((a, b) => a.berlinerisch.localeCompare(b.berlinerisch, "de"));
};

/** The latest version of a word, draft included, for the editor's preview (never cached). */
export const fetchDraftWord = async (id: number): Promise<SiteWord | undefined> => {
  const doc = await (
    await getPayloadClient()
  ).findByID({ collection: "words", depth: 1, disableErrors: true, draft: true, id, populate: WORD_POPULATE });
  return doc ? toSiteWord(doc) : undefined;
};

/** All public words (plus drafts with SHOW_TEST_DATA), memoized for a minute: an admin edit is live without a rebuild. */
export const fetchAllWords = ttl(60_000, loadAllWords);
