/** Memoizes `load` for `ms`; a rejected load is dropped so the next call retries. */
export const ttl = <T>(ms: number, load: () => Promise<T>): (() => Promise<T>) => {
  let cached: { at: number; value: Promise<T> } | undefined;
  return () => {
    if (!cached || Date.now() - cached.at >= ms) {
      const value = load();
      cached = { at: Date.now(), value };
      value.catch(() => {
        if (cached?.value === value) cached = undefined;
      });
    }
    return cached.value;
  };
};
