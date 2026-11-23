// localStorage can be missing (SSR) or throw (blocked, full): every helper stays silent and falls back.

export const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Stores `value`, or removes the key for `null`. */
export const safeSet = (key: string, value: string | null): void => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked or full: callers treat it as a convenience.
  }
};

/** Parsed JSON of `key`, `undefined` when missing, blocked or malformed. */
export const safeGetJson = (key: string): unknown => {
  try {
    const raw = safeGet(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
};
