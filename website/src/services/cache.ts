// Dev opt-in (`NO_TTL_CACHE=1 pnpm dev`): seed or CMS edits show up on the next request, at the price of a slow page.
const NO_CACHE = process.env.NO_TTL_CACHE === "1";
if (NO_CACHE && process.env.NODE_ENV === "production") {
  console.warn("[cache] NO_TTL_CACHE=1 in production: every request hits the CMS and the database");
}

// shortcut: instances created per day (services/payload/home.ts) stay registered until restart; upgrade only if that ever grows.
const resets = new Set<() => void>();

/** Drops every value held by `ttl`/`ttlBy` in this process; the next call of each loads fresh and waits for it. */
export const clearAllMemos = (): void => {
  for (const reset of resets) reset();
};

/** The memo behind `ttl`: the getter plus a `reset` that drops the stored value and orphans any refresh in flight (its result is discarded). */
const memo = <T>(ms: number, load: () => Promise<T>) => {
  let value: Promise<T> | undefined;
  let loadedAt = 0;
  let refreshing = false;
  // Bumped by a reset so a refresh that started before it cannot write its old result back.
  let generation = 0;

  const get = () => {
    if (!value) {
      const first = load();
      value = first;
      loadedAt = Date.now();
      first.catch(() => {
        if (value === first) value = undefined;
      });
    } else if (!refreshing && Date.now() - loadedAt >= ms) {
      refreshing = true;
      const started = generation;
      load()
        .then((fresh) => {
          if (generation !== started) return;
          value = Promise.resolve(fresh);
          loadedAt = Date.now();
        })
        .catch((error: unknown) =>
          console.error("[cache] refresh failed, serving stale data:", error),
        )
        .finally(() => {
          if (generation === started) refreshing = false;
        });
    }
    return value;
  };
  const reset = () => {
    generation++;
    value = undefined;
    loadedAt = 0;
    refreshing = false;
  };
  return { get, reset };
};

/**
 * Memoizes `load` for `ms`. After that the stale value is served while a single background refresh runs, so
 * a request never waits for a reload; only the very first load blocks. A failed first load is not kept, a
 * failed refresh keeps the stale value and is retried by the next call. `clearAllMemos()` drops it, unless it is
 * `external`.
 */
export const ttl = <T>(
  ms: number,
  load: () => Promise<T>,
  { external = false }: { external?: boolean } = {},
): (() => Promise<T>) => {
  if (NO_CACHE) return load;
  const { get, reset } = memo(ms, load);
  // `external`: visitor aggregates and third-party data (home stats, GitHub, Polar, Wakapi): a CMS edit must not reload them.
  if (!external) resets.add(reset);
  return get;
};

/**
 * `ttl` per key, at most `max` keys (the oldest is dropped first), so a crawl over many keys cannot grow it
 * without limit. Only for data that is the same for every visitor. `forget(key)` drops one key (the next call
 * waits for a fresh load); per process only.
 */
export const ttlBy = <K, T>(
  ms: number,
  max: number,
  load: (key: K) => Promise<T>,
): ((key: K) => Promise<T>) & { forget: (key: K) => void } => {
  const memos = new Map<K, () => Promise<T>>();
  // One reset for the whole map: the per-key memos are not registered, so evicted keys cannot pile up in `resets`.
  if (!NO_CACHE) resets.add(() => memos.clear());
  const create = (key: K) => (NO_CACHE ? () => load(key) : memo(ms, () => load(key)).get);
  return Object.assign(
    (key: K) => {
      let get = memos.get(key);
      if (!get) {
        if (memos.size >= max) memos.delete(memos.keys().next().value as K);
        memos.set(key, (get = create(key)));
      }
      return get();
    },
    { forget: (key: K) => void memos.delete(key) },
  );
};
