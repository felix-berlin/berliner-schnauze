/**
 * `Cache-Control` of a public word page. A browser may reuse it for 30 s: that is what makes a hover prefetch pay off
 * (a `max-age=0` page is fetched again on click). No `stale-while-revalidate`: with it a browser showed a page a
 * day old, and the service worker stored that copy. No `s-maxage`: no shared cache sits in front, the in-process page
 * cache is set with `Astro.cache.set`.
 */
export const WORD_PAGE_CACHE_CONTROL = "public, max-age=30";
