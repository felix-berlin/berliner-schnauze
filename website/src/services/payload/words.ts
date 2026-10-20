import type {
  AudioArray,
  Media,
  Theman,
  Word as PayloadWord,
  WordExamplesArray,
  WordType,
} from "payload-app";

import { ttl } from "@services/cache.ts";
import { getPayloadClient, mediaUrl, siteDocs, siteRead } from "@services/payload.ts";
import { SHOW_TEST_DATA } from "astro:env/client";
import { lexicalToHtml } from "payload-app/lexical-html";
import { type DerivedWordFields, deriveWordFields } from "payload-app/word-derived";

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
 * A public word as the pages render it: the Payload doc with its relations populated, relations and media rows as
 * arrays (never null; the plain text repeaters keep Payload's `| null`), media with absolute urls, and what is
 * computed once per cache window (rich text as HTML, derived fields a word never saved through the hook lacks).
 */
export type SiteWord = Omit<
  PayloadWord,
  | "berlinerischAudio"
  | "derived"
  | "examples"
  | "images"
  | "infoText"
  | "relatedWords"
  | "slug"
  | "themen"
  | "wordTypes"
> & {
  berlinerischAudio: AudioRow[];
  derived: DerivedWordFields & { decomposition?: string[] | null };
  examples: WordExample[];
  images: SiteMedia[];
  infoTextHtml: string | null;
  relatedWords: RelatedWord[];
  slug: string;
  themen: Pick<Theman, "id" | "name" | "slug">[];
  wordTypes: Pick<WordType, "id" | "name">[];
};

const populated = <T extends object>(
  items: readonly (T | number | null)[] | null | undefined,
): T[] => (items ?? []).filter((item): item is T => typeof item === "object" && item !== null);

/** A populated media doc as SiteMedia; null for an unpopulated id, a missing doc or a doc without a file. */
export const toSiteMedia = (media: Media | number | null | undefined): SiteMedia | null => {
  if (typeof media !== "object" || !media) return null;
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
    const media = toSiteMedia(audio);
    return media ? [{ ...row, audio: media }] : [];
  });

/**
 * The derived fields the hook stored on save, computed only for a word that never went through it. Payload returns
 * an unset group as an object of nulls, so check a field the hook always sets.
 */
const storedDerived = (
  derived: PayloadWord["derived"],
  { berlinerisch, slug }: Pick<PayloadWord, "berlinerisch"> & { slug: string },
): SiteWord["derived"] => {
  if (derived?.wordGroup != null) return derived as SiteWord["derived"];
  console.warn(`[words] derived fields missing, computed on the fly: ${slug}`);
  return deriveWordFields(berlinerisch);
};

/**
 * `doc` must be populated one level deep (relations and media are objects, not ids) and have a slug: ids are
 * dropped silently. Exported for the tests; pages go through fetchAllWords/fetchDraftWord.
 */
export const toWord = ({
  berlinerischAudio,
  derived,
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
  derived: storedDerived(derived, doc),
  examples: (examples ?? []).map(({ exampleAudio, ...e }) =>
    Object.assign(e, { exampleAudio: audioRows(exampleAudio) }),
  ),
  images: (images ?? []).flatMap((m) => toSiteMedia(m) ?? []),
  infoTextHtml: lexicalToHtml(infoText) || null,
  // siteRead() leaves a related word the site may not show unpopulated (an id), and populated() drops ids
  relatedWords: populated<PayloadWord>(relatedWords).flatMap(({ berlinerisch, id, slug }) =>
    slug ? [{ berlinerisch, id, slug }] : [],
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
  words: { berlinerisch: true, slug: true },
} as const;

/** A word as a draft may be stored: strictDraftTypes types its required fields optional. */
type StoredWord = Omit<PayloadWord, "berlinerisch" | "createdAt" | "updatedAt"> &
  Partial<Pick<PayloadWord, "berlinerisch" | "createdAt" | "updatedAt">>;

/** A stored word as a SiteWord, or undefined when it lacks what a page needs (a draft may). */
const toSiteWord = (doc: StoredWord): SiteWord | undefined => {
  const { berlinerisch, createdAt, slug, updatedAt } = doc;
  if (slug && berlinerisch && createdAt && updatedAt)
    return toWord({ ...doc, berlinerisch, createdAt, slug, updatedAt });
  console.warn(
    `[words] Word without slug or headword skipped: id ${doc.id}, berlinerisch "${berlinerisch}"`,
  );
  return undefined;
};

const loadAllWords = async (): Promise<SiteWord[]> => {
  const payload = await getPayloadClient();
  const words: SiteWord[] = [];
  // Pages by id (after the last one) without pagination: no count query per page, no growing OFFSET.
  for (let afterId = 0; ;) {
    // oxlint-disable-next-line no-await-in-loop -- sequential pages keep the memory and DB load flat
    const { docs } = await payload.find({
      collection: "words",
      depth: 1,
      limit: PAGE_SIZE,
      pagination: false,
      populate: WORD_POPULATE,
      sort: "id",
      where: { id: { greater_than: afterId } },
      ...siteDocs(),
    });
    for (const doc of docs) {
      const word = toSiteWord(doc);
      if (word) words.push(word);
    }
    const last = docs.at(-1);
    if (!last || docs.length < PAGE_SIZE) break;
    afterId = last.id;
  }

  return words.sort(byHeadword);
};

// German collation here, not the database's: the neighbor sections depend on this order.
const byHeadword = (a: SiteWord, b: SiteWord) => a.berlinerisch.localeCompare(b.berlinerisch, "de");

/** The latest version of a word, draft included, for the editor's preview (never cached). */
export const fetchDraftWord = async (id: number): Promise<SiteWord | undefined> => {
  const payload = await getPayloadClient();
  const doc = await payload.findByID({
    collection: "words",
    depth: 1,
    disableErrors: true,
    draft: true,
    id,
    populate: WORD_POPULATE,
  });
  if (!doc) return undefined;
  // `draft: true` (read as the editor) populates each related word as its latest version, a draft even when a
  // published one exists: load them as the public page does (published only), so the preview shows the same ones.
  const ids = (doc.relatedWords ?? []).map((w) => (typeof w === "object" ? w.id : w));
  const { docs: related } = ids.length
    ? await payload.find({
        collection: "words",
        depth: 0,
        limit: ids.length,
        pagination: false,
        where: { id: { in: ids } },
        ...siteRead(),
      })
    : { docs: [] };
  return toSiteWord({
    ...doc,
    relatedWords: ids.flatMap((rid) => related.find((w) => w.id === rid) ?? []),
  });
};

type Fingerprint = { others: string; total: number; wordsAt: string };

/**
 * Cheap fingerprint of what loadAllWords reads: the public word count and the latest change of the words and of
 * every collection populated into them. Unchanged, the reload is skipped.
 */
const wordsFingerprint = async (): Promise<Fingerprint> => {
  const payload = await getPayloadClient();
  const latest = { depth: 0, limit: 1, select: { updatedAt: true }, sort: "-updatedAt" } as const;
  const [words, ...others] = await Promise.all([
    payload.find({ collection: "words", ...latest, ...siteDocs() }),
    ...(["media", "themen", "word-types"] as const).map((collection) =>
      // Only the words need totalDocs: no count query for the others.
      payload.find({ collection, ...latest, pagination: false, ...siteRead() }),
    ),
  ]);
  return {
    others: others.map((r) => r.docs[0]?.updatedAt ?? "").join("|"),
    total: words.totalDocs,
    wordsAt: words.docs[0]?.updatedAt ?? "",
  };
};

/** More changed words than this, and a full reload is about as cheap. */
const MAX_PATCH = 200;

/**
 * The words array with only what changed since `prev` reloaded: the words saved since (in any status: one that left
 * the public set must go) and the words listing them as related (they show its headword and slug). Undefined when
 * a full reload is needed: media, themen or word types changed, a word was deleted (the counts do not add up),
 * too many changes, or the drafts listing (its versions are not in the words table).
 */
const patchWords = async (
  prev: Fingerprint & { words: SiteWord[] },
  next: Fingerprint,
): Promise<SiteWord[] | undefined> => {
  if (SHOW_TEST_DATA || prev.others !== next.others || !prev.wordsAt) return undefined;
  const payload = await getPayloadClient();
  const { docs: changed } = await payload.find({
    collection: "words",
    depth: 0,
    limit: MAX_PATCH + 1,
    overrideAccess: true,
    pagination: false,
    select: { updatedAt: true },
    where: { updatedAt: { greater_than_equal: prev.wordsAt } },
  });
  if (changed.length > MAX_PATCH) return undefined;
  const ids = changed.map((d) => d.id);
  const { docs } = await payload.find({
    collection: "words",
    depth: 1,
    pagination: false,
    populate: WORD_POPULATE,
    where: { or: [{ id: { in: ids } }, { relatedWords: { in: ids } }] },
    ...siteRead(),
  });
  const byId = new Map(prev.words.map((w) => [w.id, w]));
  for (const id of ids) byId.delete(id);
  for (const doc of docs) {
    const word = toSiteWord(doc);
    if (word) byId.set(word.id, word);
  }
  // Words a full load skips (no slug) count in `total` too: the gap between the two must stay the same.
  if (next.total - byId.size !== prev.total - prev.words.length) return undefined;
  return [...byId.values()].sort(byHeadword);
};

let loaded: (Fingerprint & { words: SiteWord[] }) | undefined;

/**
 * All public words (plus drafts with SHOW_TEST_DATA), checked for changes once a minute: an admin edit is live
 * without a rebuild. An edit reloads only the words it touches; the same array is returned while nothing changed,
 * so indexes keyed on it stay warm.
 */
export const fetchAllWords = ttl(60_000, async (): Promise<SiteWord[]> => {
  const next = await wordsFingerprint();
  if (
    !loaded ||
    loaded.total !== next.total ||
    loaded.wordsAt !== next.wordsAt ||
    loaded.others !== next.others
  ) {
    const words = (loaded && (await patchWords(loaded, next))) ?? (await loadAllWords());
    loaded = { ...next, words };
  }
  return loaded.words;
});

const bySlug = new WeakMap<SiteWord[], Map<string, SiteWord>>();

/** A public word by its slug, through a slug index built once per words array. */
export const fetchWordBySlug = async (slug: string): Promise<SiteWord | undefined> => {
  const words = await fetchAllWords();
  let index = bySlug.get(words);
  if (!index) bySlug.set(words, (index = new Map(words.map((w) => [w.slug, w]))));
  return index.get(slug);
};
