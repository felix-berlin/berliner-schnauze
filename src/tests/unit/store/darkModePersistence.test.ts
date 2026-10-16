import { describe, expect, it, afterEach, vi } from "vitest";

// `vi.resetModules()` also re-instantiates `@nanostores/persistent`, so the test
// storage engine must be installed on the same instance the store imports.
async function loadStore(stored?: string) {
  vi.resetModules();
  const persistent = await import("@nanostores/persistent");
  persistent.useTestStorageEngine();
  persistent.cleanTestStorage();
  if (stored !== undefined) persistent.setTestStorageKey("darkMode", stored);
  return { ...(await import("@stores/darkMode.ts")), getTestStorage: persistent.getTestStorage };
}

describe("darkMode store — persistence decode/encode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("decode returns null when stored value is null string", async () => {
    const { $isDarkMode } = await loadStore("null");
    expect($isDarkMode.get()).toBeNull();
  });

  it("decode returns true when stored value is 'true'", async () => {
    const { $isDarkMode } = await loadStore("true");
    expect($isDarkMode.get()).toBe(true);
  });

  it("decode returns false when stored value is 'false'", async () => {
    const { $isDarkMode } = await loadStore("false");
    expect($isDarkMode.get()).toBe(false);
  });

  it("decode returns null and logs warning on invalid JSON", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { $isDarkMode } = await loadStore("not-valid-json{");
    expect($isDarkMode.get()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[darkMode]"),
      expect.any(String),
      expect.any(Error),
    );
  });

  it("encode stores value as JSON string", async () => {
    const { $isDarkMode, getTestStorage } = await loadStore();
    $isDarkMode.set(true);
    expect($isDarkMode.get()).toBe(true);
    expect(getTestStorage().darkMode).toBe("true");
  });
});
