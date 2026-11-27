import type { TextPart } from "@utils/homeSearch.ts";

import { terms } from "./query";

const MIN_TERM = 3;

/** Marks every query term of at least 3 letters, case-insensitively; longer terms win on overlap. */
export function highlightParts(text: string, q: string): TextPart[] {
  const found = [...new Set(terms(q).filter((t) => t.length >= MIN_TERM))].sort(
    (a, b) => b.length - a.length,
  );
  if (!found.length) return [{ mark: false, text }];
  const re = new RegExp(
    `(${found.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "iu",
  );
  // The capture group keeps the matches: odd indices are the hits.
  return text
    .split(re)
    .map((part, i) => ({ mark: i % 2 === 1, text: part }))
    .filter((part) => part.text);
}
