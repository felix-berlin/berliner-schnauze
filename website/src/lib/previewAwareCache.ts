import type { CacheProviderFactory } from "astro";

import { PREVIEW_COOKIE } from "@services/preview.ts";
import memoryProvider from "astro/cache/memory";

/**
 * Astro's memory cache, skipped for a request that carries a preview cookie. A cache hit is served before any
 * page code runs, so the page cannot opt out itself: an editor must see the draft, not the cached public page.
 */
const factory: CacheProviderFactory = (config) => {
  const memory = memoryProvider(config);
  return {
    ...memory,
    onRequest: (context, next) =>
      context.request.headers.get("cookie")?.includes(`${PREVIEW_COOKIE}=`)
        ? next()
        : memory.onRequest!(context, next),
  };
};

export default factory;
