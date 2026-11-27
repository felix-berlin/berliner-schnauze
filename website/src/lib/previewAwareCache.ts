import type { CacheProviderFactory } from "astro";

import { clearAllMemos } from "@services/cache.ts";
import { createStampPoller, readStamp } from "@services/cacheStamp.ts";
import { PREVIEW_COOKIE } from "@services/preview.ts";
import memoryProvider from "astro/cache/memory";

/** Every cached page carries this tag, so one `invalidate` empties the whole page cache. */
const SITE_TAG = "site";

/** `Cache-Tag` of a rendered page plus `site`; Astro's memory cache reads the tags from this header. */
const withSiteTag = (response: Response): Response => {
  const tags = response.headers.get("Cache-Tag");
  const value = tags ? `${tags}, ${SITE_TAG}` : SITE_TAG;
  try {
    response.headers.set("Cache-Tag", value);
    return response;
  } catch {
    // A redirect from Response.redirect() has immutable headers: copy it.
    const copy = new Response(response.body, response);
    copy.headers.set("Cache-Tag", value);
    return copy;
  }
};

/**
 * Astro's memory cache, skipped for two kinds of request. A cache hit is served before any page code runs, so a
 * page cannot opt out itself:
 * - a preview cookie: an editor must see the draft, not the cached public page;
 * - `/?q=…`: the start page redirects that old share link to /suche, and the cache key ignores the query.
 *
 * It also watches the CMS change stamp (`services/cacheStamp.ts`): on a change it empties this cache and every
 * `ttl` memo, so an edit shows within seconds instead of after the cache windows. The poll runs on every request,
 * also the ones that skip the cache, and never waits.
 */
const factory: CacheProviderFactory = (config) => {
  const memory = memoryProvider(config);
  const poll = createStampPoller({
    onChange: async () => {
      clearAllMemos();
      await memory.invalidate({ tags: SITE_TAG });
    },
    read: readStamp,
  });
  return {
    ...memory,
    onRequest: (context, next) => {
      poll();
      return context.request.headers.get("cookie")?.includes(`${PREVIEW_COOKIE}=`) ||
        (context.url.pathname === "/" && context.url.searchParams.has("q"))
        ? next()
        : memory.onRequest!(context, async () => withSiteTag(await next()));
    },
  };
};

export default factory;
