import type { CacheProviderFactory } from "astro";

import { clearAllMemos } from "@services/cache.ts";
import { createStampPoller, readStamp } from "@services/cacheStamp.ts";
import { PREVIEW_COOKIE } from "@services/preview.ts";
import memoryProvider from "astro/cache/memory";

/** Every cached page carries this tag, so one `invalidate` empties the whole page cache. */
const SITE_TAG = "site";

/** Longest a request waits for the stamp check; a slow database must not slow the site down. */
const CHECK_WAIT_MS = 250;

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
 * - `/?q=…`: the start page redirects that old share link to /wort, and the cache key ignores the query;
 * - `/wort` with any query: the search page renders its hits server side, and the cache key ignores the query.
 *
 * It also watches the CMS change stamp (`services/cacheStamp.ts`): on a change it empties this cache and every
 * `ttl` memo (not the `external` ones), so an edit shows within seconds instead of after the cache windows. The
 * check runs on every request, also the ones that skip the cache, at most once per interval; the request that starts
 * it waits for it (at most `CHECK_WAIT_MS`), otherwise the first visitor after an edit would still get the old page.
 * After that wait the clear may still be running: serving the new data is best effort.
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
    onRequest: async (context, next) => {
      const check = poll();
      if (check) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        // poll() does not reject by contract; a broken check must still never take the page down.
        await Promise.race([
          check.catch(() => {}),
          new Promise((resolve) => (timer = setTimeout(resolve, CHECK_WAIT_MS))),
        ]);
        clearTimeout(timer);
      }
      return context.request.headers.get("cookie")?.includes(`${PREVIEW_COOKIE}=`) ||
        (context.url.pathname === "/" && context.url.searchParams.has("q")) ||
        (context.url.pathname === "/wort" && context.url.search !== "")
        ? next()
        : memory.onRequest!(context, async () => withSiteTag(await next()));
    },
  };
};

export default factory;
