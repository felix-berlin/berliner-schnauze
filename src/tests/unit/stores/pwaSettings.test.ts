import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

const load = () => import("@stores/pwaSettings.ts");

describe("pwaSettings — $updateMode", () => {
  it("defaults to prompt", async () => {
    const { $updateMode } = await load();
    expect($updateMode.get()).toBe("prompt");
  });

  it("restores a persisted mode", async () => {
    localStorage.setItem("pwaUpdateMode", "auto");
    const { $updateMode } = await load();
    expect($updateMode.get()).toBe("auto");
  });

  it("falls back to prompt for an unknown persisted value", async () => {
    localStorage.setItem("pwaUpdateMode", "sometimes");
    const { $updateMode } = await load();
    expect($updateMode.get()).toBe("prompt");
  });
});

describe("pwaSettings — $offlineDictionary", () => {
  it("defaults to disabled, wifi-only, never synced", async () => {
    const { $offlineDictionary } = await load();
    expect($offlineDictionary.get()).toEqual({
      enabled: false,
      syncedVersion: null,
      wifiOnly: true,
    });
  });

  it("falls back to defaults for corrupt JSON", async () => {
    localStorage.setItem("pwaOfflineDictionary", "{not json");
    const { $offlineDictionary } = await load();
    expect($offlineDictionary.get().enabled).toBe(false);
  });

  it("fills missing keys from defaults", async () => {
    localStorage.setItem("pwaOfflineDictionary", JSON.stringify({ enabled: true }));
    const { $offlineDictionary } = await load();
    expect($offlineDictionary.get()).toEqual({
      enabled: true,
      syncedVersion: null,
      wifiOnly: true,
    });
  });

  it("patchOfflineDictionary merges and persists", async () => {
    const { $offlineDictionary, patchOfflineDictionary } = await load();
    patchOfflineDictionary({ enabled: true });
    patchOfflineDictionary({ syncedVersion: "1.2.3" });
    expect($offlineDictionary.get()).toEqual({
      enabled: true,
      syncedVersion: "1.2.3",
      wifiOnly: true,
    });
    expect(JSON.parse(localStorage.getItem("pwaOfflineDictionary") ?? "{}").syncedVersion).toBe(
      "1.2.3",
    );
  });
});
