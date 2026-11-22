// Dev opt-in (`NO_TTL_CACHE=1 pnpm dev`): seed or CMS edits show up on the next request, at the price of a slow page.
const NO_CACHE = process.env.NO_TTL_CACHE === "1";
if (NO_CACHE && process.env.NODE_ENV === "production") {
  console.warn("[cache] NO_TTL_CACHE=1 in production: every request hits the CMS and the database");
}

/**
 * Memoizes `load` for `ms`. After that the stale value is served while a single background refresh runs, so
 * a request never waits for a reload; only the very first load blocks. A failed first load is not kept, a
 * failed refresh keeps the stale value and is retried by the next call.
 */
export const ttl = <T>(ms: number, load: () => Promise<T>): (() => Promise<T>) => {
  if (NO_CACHE) return load;
  let value: Promise<T> | undefined;
  let loadedAt = 0;
  let refreshing = false;

  return () => {
    if (!value) {
      const first = load();
      value = first;
      loadedAt = Date.now();
      first.catch(() => {
        if (value === first) value = undefined;
      });
    } else if (!refreshing && Date.now() - loadedAt >= ms) {
      refreshing = true;
      load()
        .then((fresh) => {
          value = Promise.resolve(fresh);
          loadedAt = Date.now();
        })
        .catch((error: unknown) =>
          console.error("[cache] refresh failed, serving stale data:", error),
        )
        .finally(() => {
          refreshing = false;
        });
    }
    return value;
  };
};
