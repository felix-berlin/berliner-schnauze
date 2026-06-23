import {
  useTestStorageEngine,
  setTestStorageKey,
  cleanTestStorage,
} from "@nanostores/persistent";
import { describe, expect, it, beforeAll, afterEach, vi } from "vitest";

describe("darkMode store — persistence decode/encode", () => {
  beforeAll(() => {
    useTestStorageEngine();
  });

  afterEach(() => {
    cleanTestStorage();
    vi.resetModules();
  });

  it("decode returns null when stored value is null string", async () => {
    setTestStorageKey("darkMode", "null");
    const { $isDarkMode } = await import("@stores/darkMode.ts");
    expect($isDarkMode.get()).toBeNull();
  });

  it("decode returns true when stored value is 'true'", async () => {
    vi.resetModules();
    setTestStorageKey("darkMode", "true");
    const { $isDarkMode } = await import("@stores/darkMode.ts");
    expect($isDarkMode.get()).toBe(true);
  });

  it("decode returns false when stored value is 'false'", async () => {
    vi.resetModules();
    setTestStorageKey("darkMode", "false");
    const { $isDarkMode } = await import("@stores/darkMode.ts");
    expect($isDarkMode.get()).toBe(false);
  });

  it("decode returns null and logs warning on invalid JSON", async () => {
    vi.resetModules();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    setTestStorageKey("darkMode", "not-valid-json{");
    const { $isDarkMode } = await import("@stores/darkMode.ts");
    expect($isDarkMode.get()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[darkMode]"),
      expect.any(String),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it("encode stores value as JSON string", async () => {
    vi.resetModules();
    const { $isDarkMode } = await import("@stores/darkMode.ts");
    $isDarkMode.set(true);
    expect($isDarkMode.get()).toBe(true);
  });
});
