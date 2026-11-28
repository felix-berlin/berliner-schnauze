import type { SearchState } from "./state";
import { CONTENT_KEYS, type ContentKey, type SearchEntry } from "./types";

import { matches } from "./filters";

/** Each option's count ignores its own group, so it shows what selecting it would give. */
export function facets(entries: SearchEntry[], s: SearchState) {
  const letters: Record<string, number> = {};
  const content = Object.fromEntries(CONTENT_KEYS.map((k) => [k, 0])) as Record<ContentKey, number>;
  let total = 0;
  const noLetter = { ...s, letter: undefined };
  const noContent = { ...s, content: [] };
  for (const e of entries) {
    if (matches(e, s)) total++;
    if (matches(e, noLetter)) letters[e.wordGroup] = (letters[e.wordGroup] ?? 0) + 1;
    if (matches(e, noContent)) {
      for (const k of CONTENT_KEYS) if (matches(e, { ...noContent, content: [k] })) content[k]++;
    }
  }
  return { content, letters, total };
}
