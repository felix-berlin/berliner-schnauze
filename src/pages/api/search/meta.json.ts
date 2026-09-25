import type { APIRoute } from "astro";

import { fetchAllThemen } from "@services/api.ts";

import { getSearchIndexEntries } from "@/pages/api/search/index.json.ts";

const getMinMax = (arr: number[]) => ({
  max: arr.length ? Math.max(...arr) : 0,
  min: arr.length ? Math.min(...arr) : 0,
});

export const GET: APIRoute = async () => {
  const [entries, allThemen] = await Promise.all([getSearchIndexEntries(), fetchAllThemen()]);

  const themen = allThemen
    .filter((t): t is typeof t & { name: string; slug: string } => !!t.slug && !!t.name)
    .map((t) => ({ name: t.name, slug: t.slug }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

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

  return new Response(JSON.stringify(meta));
};
