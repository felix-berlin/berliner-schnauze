import type { OramaSearchIndex } from "@/pages/api/search/index.json";

/**
 * Bump `v` (and the service worker route in astro.config.mjs) whenever the entry shape changes:
 * an old worker caches only the unversioned URL, so it can never hand an old index to new code.
 */
export const SEARCH_INDEX_URL = "/api/search/index.json?v=2";

let pending: null | Promise<OramaSearchIndex[]> = null;

/** Entries of the current shape: an older index lacks `form`/`has` and would throw deep in the search core. */
const isCurrent = (entries: unknown): entries is OramaSearchIndex[] =>
  Array.isArray(entries) &&
  entries.every((e: unknown) => typeof e === "object" && !!e && "form" in e && "has" in e);

async function get(url: string): Promise<unknown> {
  const response = await fetch(url, url === SEARCH_INDEX_URL ? undefined : { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`[searchIndex] search index fetch failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch the search index once per page session (single-flight): the
 * word list and the BON game share one request. On failure the memoized
 * promise is cleared so the next call retries. An index of an old shape
 * (stale cache) is fetched once more past every cache, then rejected.
 */
export function fetchSearchIndex(): Promise<OramaSearchIndex[]> {
  pending ??= get(SEARCH_INDEX_URL)
    .then(async (entries) => {
      if (isCurrent(entries)) return entries;
      // The extra param misses the service worker route (anchored at `?v=2$`).
      const fresh = await get(`${SEARCH_INDEX_URL}&fresh=${Date.now()}`);
      if (isCurrent(fresh)) return fresh;
      throw new Error("[searchIndex] search index has an outdated shape");
    })
    .catch((err: unknown) => {
      pending = null;
      throw err;
    });
  return pending;
}
