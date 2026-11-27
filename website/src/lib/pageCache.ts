/**
 * `Cache-Control` of a public word page. A browser may reuse it for 30 s: that is what makes a hover prefetch pay off
 * (a `max-age=0` page is fetched again on click). No `stale-while-revalidate`: with it a browser may show a page up
 * to a day old and the service worker may store that copy (the likely cause of a missing Jeschichte; never reproduced). No `s-maxage`: no shared cache sits in front, the in-process page
 * cache is set with `Astro.cache.set`.
 */
export const WORD_PAGE_CACHE_CONTROL = "public, max-age=30";
