import { trackEvent } from "@utils/analytics";

export type PersistState = "unsupported" | "persisted" | "not-persisted";

export async function getPersistState(): Promise<PersistState> {
  if (!navigator.storage?.persisted) return "unsupported";
  return (await navigator.storage.persisted()) ? "persisted" : "not-persisted";
}

/** Asks the browser not to evict our caches under storage pressure (Chrome decides heuristically). */
export async function requestPersistentStorage(): Promise<PersistState> {
  if (!navigator.storage?.persist) return "unsupported";
  const granted = await navigator.storage.persist();
  trackEvent("App", granted ? "Persistent storage granted" : "Persistent storage denied", "PWA");
  return granted ? "persisted" : "not-persisted";
}
