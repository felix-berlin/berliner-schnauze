import type { OramaSearchIndex } from "@/pages/api/search/index.json";

let pending: null | Promise<OramaSearchIndex[]> = null;

/**
 * Fetch the static search index once per page session (single-flight): the
 * word list and the BON game share one request. On failure the memoized
 * promise is cleared so the next call retries.
 */
export function fetchSearchIndex(): Promise<OramaSearchIndex[]> {
  pending ??= fetch("/api/search/index.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`[searchIndex] search index fetch failed: ${response.status}`);
      }
      return response.json() as Promise<OramaSearchIndex[]>;
    })
    .catch((err: unknown) => {
      pending = null;
      throw err;
    });
  return pending;
}
