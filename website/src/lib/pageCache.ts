/**
 * `Cache-Control` of an HTML page: 30 s so a hover prefetch pays off. No `stale-while-revalidate` (a browser and the
 * service worker may keep a page up to a day old) and no `s-maxage` (no shared cache in front). Set by `setPageCache`
 * and by the word page.
 */
export const PAGE_CACHE_CONTROL = "public, max-age=30";
