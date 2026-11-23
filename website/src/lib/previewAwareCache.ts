import type { CacheProviderFactory } from "astro";

import { PREVIEW_COOKIE } from "@services/preview.ts";
import memoryProvider from "astro/cache/memory";

/**
 * Astro's memory cache, skipped for two kinds of request. A cache hit is served before any page code runs, so a
 * page cannot opt out itself:
 * - a preview cookie: an editor must see the draft, not the cached public page;
 * - `/?q=…`: the start page redirects that old share link to /suche, and the cache key ignores the query.
 */
const factory: CacheProviderFactory = (config) => {
  const memory = memoryProvider(config);
  return {
    ...memory,
    onRequest: (context, next) =>
      context.request.headers.get("cookie")?.includes(`${PREVIEW_COOKIE}=`) ||
      (context.url.pathname === "/" && context.url.searchParams.has("q"))
        ? next()
        : memory.onRequest!(context, next),
  };
};

export default factory;
