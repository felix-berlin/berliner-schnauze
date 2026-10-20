import type { APIRoute } from "astro";

import { fetchAllThemen } from "@services/payload/themen.ts";
import { etagOf, jsonWithEtag } from "@utils/cacheHeaders.ts";

import { getSearchIndexEntries } from "@/pages/api/search/index.json.ts";

const getMinMax = (arr: number[]) => ({
  max: arr.length ? Math.max(...arr) : 0,
  min: arr.length ? Math.min(...arr) : 0,
});

/** The last meta, kept while the entries and themen arrays are the same ones (both are memoized upstream). */
let last: { allThemen: unknown; entries: unknown; etag: string; json: string } | undefined;

export const GET: APIRoute = async ({ request }) => {
  const [entries, allThemen] = await Promise.all([getSearchIndexEntries(), fetchAllThemen()]);
  if (last?.entries !== entries || last.allThemen !== allThemen) {
    const json = JSON.stringify(buildMeta(entries, allThemen));
    last = { allThemen, entries, etag: etagOf(json), json };
  }
  return jsonWithEtag(request, last.json, last.etag);
};

const buildMeta = (
  entries: Awaited<ReturnType<typeof getSearchIndexEntries>>,
  allThemen: Awaited<ReturnType<typeof fetchAllThemen>>,
) => {
  const themen = allThemen.map(({ name, slug }) => ({ name, slug }));

  // Everything else comes from the search index entries, so the NLP word
  // types, hyphenation and letter counts use the exact same logic.

  const availableWordGroups = Array.from(new Set(entries.map((e) => e.wordGroup.toUpperCase())))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "de"));

  const wordTypes = Array.from(new Set(entries.flatMap((e) => e.berlinerischWordTypes)))
    .filter(Boolean)
    .sort();

  const props = entries.map((e) => e.wordProperties);

  const meta = {
    availableWordGroups,
    rangeFilterMinMax: {
      characterLength: getMinMax(props.map((p) => p.characterLength)),
      consonantsCount: getMinMax(props.map((p) => p.consonantsCount)),
      syllablesCount: getMinMax(props.map((p) => p.syllablesCount)),
      vowelsCount: getMinMax(props.map((p) => p.vowelsCount)),
    },
    themen,
    wordTypes,
  };

  return meta;
};
