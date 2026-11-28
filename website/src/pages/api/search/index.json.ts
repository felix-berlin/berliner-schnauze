import type { APIRoute } from "astro";

import { fetchAllWords, type SiteWord, translationTexts } from "@services/payload/words.ts";
import { searchStatsOrEmpty } from "@services/searchStats.ts";
import { etagOf, jsonWithEtag } from "@utils/cacheHeaders.ts";

import type { SearchEntry, Usage } from "@/lib/search/types";

import { soundex } from "@/lib/search/query";

/** The base fields only (what the BON game and the start page read); `SearchEntry` adds the search-page fields. */
export type OramaSearchIndex = ReturnType<typeof makeBaseEntry>;

/** Epoch ms of an ISO date, 0 when absent or invalid. */
const timestamp = (iso: string | null | undefined): number => (iso && Date.parse(iso)) || 0;

/**
 * Assembles the slim public entry from stored fields: nothing here may carry definitions, examples or sources.
 * Its shape is public (cached by the service worker on visitors' devices).
 */
function makeBaseEntry(word: SiteWord) {
  const { berlinerisch, derived } = word;
  // Editor-set types win over the automatic guess.
  const editorial = word.wordTypes.map((t) => t.name);
  const wordTypes = editorial.length
    ? editorial
    : [...new Set(derived.nlpTags.flatMap((t) => Object.values(t).flat()))];

  return {
    berlinerischWordTypes: wordTypes,
    dateTs: timestamp(word.publishedAt),
    modifiedTs: timestamp(word.contentModifiedAt),
    slug: word.slug,
    themen: word.themen.flatMap((t) => t.slug ?? []),
    wordComponents: derived.wordComponents ?? [],
    wordGroup: derived.wordGroup ?? "",
    wordProperties: {
      audioBerlinerisch: word.berlinerischAudio.length > 0,
      audioExamples: word.examples.some((e) => e.exampleAudio.length > 0),
      berlinerisch,
      berolinismus: !!word.berolinismus,
      characterLength: derived.characterLength ?? berlinerisch.length,
      consonantsCount: derived.consonantsCount ?? 0,
      multipleMeanings: (word.alternativeWords?.length ?? 0) > 0,
      syllablesCount: derived.syllablesCount ?? 0,
      translations: translationTexts(word),
      vowelsCount: derived.vowelsCount ?? 0,
    },
  };
}

export function makeOramaSearchIndex(
  word: SiteWord,
  stats?: { stories: number; usage?: Usage },
): SearchEntry {
  const base = makeBaseEntry(word);
  const { derived } = word;
  const examples = word.examples.length > 0;
  const facts = (word.facts?.length ?? 0) > 0;
  return {
    ...base,
    article: word.article ?? "",
    // The search list's play button; the url is public on the word page anyway.
    ...(word.berlinerischAudio[0] && { audio: word.berlinerischAudio[0].audio.url }),
    form: {
      length: derived.characterLength ?? word.berlinerisch.length,
      soundex: derived.soundexCode || soundex(word.berlinerisch),
      syllables: derived.syllablesCount ?? 0,
    },
    // Same conditions as the `gap` props of WordFactsCard / WordNetworkCard (plus examples and word audio).
    has: {
      examples,
      examplesAudio: base.wordProperties.audioExamples,
      facts,
      gap:
        !examples ||
        !facts ||
        !base.wordProperties.audioBerlinerisch ||
        (word.related?.length ?? 0) === 0,
      images: word.images.length > 0,
      stories: (stats?.stories ?? 0) > 0,
    },
    ...(stats?.usage && { usage: stats.usage }),
  };
}

// index.json and the server word db both need the entries: map (and serialize) each memoized words array once.
const indexByWords = new WeakMap<
  SiteWord[],
  { entries: SearchEntry[]; etag: string; json: string }
>();

const searchIndex = async () => {
  const [words, stats] = await Promise.all([fetchAllWords(), searchStatsOrEmpty()]);
  let index = indexByWords.get(words);
  if (!index) {
    const entries = words.map((w) => makeOramaSearchIndex(w, stats.get(w.id)));
    const json = JSON.stringify(entries);
    indexByWords.set(words, (index = { entries, etag: etagOf(json), json }));
  }
  return index;
};

export const getSearchIndexEntries = async (): Promise<SearchEntry[]> =>
  (await searchIndex()).entries;

export const GET: APIRoute = async ({ request }) => {
  const { etag, json } = await searchIndex();
  return jsonWithEtag(request, json, etag);
};
