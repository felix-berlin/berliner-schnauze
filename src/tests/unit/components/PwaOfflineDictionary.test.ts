import PwaOfflineDictionary from "@components/PwaOfflineDictionary.vue";
import { $offlineDictionaryProgress } from "@services/offlineDictionary";
import { $offlineDictionary } from "@stores/pwaSettings.ts";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { version } from "../../../../package.json";

const networkType = ref<string | undefined>(undefined);
vi.mock("@vueuse/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vueuse/core")>()),
  useNetwork: () => ({ type: networkType }),
}));
vi.mock("@services/storagePersistence", () => ({
  getPersistState: vi.fn().mockResolvedValue("not-persisted"),
  requestPersistentStorage: vi.fn().mockResolvedValue("persisted"),
}));
vi.mock("@services/offlineDictionary", async () => {
  const { atom } = await import("nanostores");
  return {
    $offlineDictionaryProgress: atom({ bytes: 0, done: 0, mode: null, state: "idle", total: 0 }),
    cancelDownload: vi.fn(),
    disableOfflineDictionary: vi.fn(),
    enableOfflineDictionary: vi.fn(),
    estimateDownloadBytes: vi.fn().mockResolvedValue(270_000_000),
    pauseDownload: vi.fn(),
    resumeIfNeeded: vi.fn(),
    startDownload: vi.fn(),
  };
});

const IDLE = { bytes: 0, done: 0, mode: null, state: "idle", total: 0 } as const;

async function mountIt() {
  const wrapper = mount(PwaOfflineDictionary);
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  networkType.value = undefined;
  $offlineDictionary.set({
    enabled: false,
    failedVersion: null,
    syncedVersion: null,
    wifiOnly: true,
  });
  $offlineDictionaryProgress.set({ ...IDLE });
});

describe("PwaOfflineDictionary.vue", () => {
  it("shows the size estimate while disabled", async () => {
    const wrapper = await mountIt();
    // formatBytes(270_000_000) with base-1024 formatting
    expect(wrapper.text()).toContain("257,5 MB");
  });

  it("toggling on enables the dictionary and emits changed", async () => {
    const { enableOfflineDictionary } = await import("@services/offlineDictionary");
    const wrapper = await mountIt();
    await wrapper.find("[data-testid=offline-dictionary-toggle]").setValue(true);
    await flushPromises();
    expect(enableOfflineDictionary).toHaveBeenCalledOnce();
    expect(wrapper.emitted("changed")).toBeTruthy();
  });

  it("toggling off disables the dictionary", async () => {
    $offlineDictionary.set({
      enabled: true,
      failedVersion: null,
      syncedVersion: version,
      wifiOnly: true,
    });
    const { disableOfflineDictionary } = await import("@services/offlineDictionary");
    const wrapper = await mountIt();
    await wrapper.find("[data-testid=offline-dictionary-toggle]").setValue(false);
    await flushPromises();
    expect(disableOfflineDictionary).toHaveBeenCalledOnce();
  });

  it("hides the wifi toggle when the connection type is unknown", async () => {
    $offlineDictionary.set({
      enabled: true,
      failedVersion: null,
      syncedVersion: null,
      wifiOnly: true,
    });
    const wrapper = await mountIt();
    expect(wrapper.find("[data-testid=offline-dictionary-wifi]").exists()).toBe(false);
  });

  it("shows the wifi toggle when supported; turning it off resumes", async () => {
    networkType.value = "cellular";
    $offlineDictionary.set({
      enabled: true,
      failedVersion: null,
      syncedVersion: null,
      wifiOnly: true,
    });
    const { resumeIfNeeded } = await import("@services/offlineDictionary");
    const wrapper = await mountIt();
    await wrapper.find("[data-testid=offline-dictionary-wifi]").setValue(false);
    expect($offlineDictionary.get().wifiOnly).toBe(false);
    expect(resumeIfNeeded).toHaveBeenCalled();
  });

  it("in-page running download: shows count, pause and cancel", async () => {
    $offlineDictionary.set({
      enabled: true,
      failedVersion: null,
      syncedVersion: null,
      wifiOnly: true,
    });
    $offlineDictionaryProgress.set({
      bytes: 1_500_000,
      done: 20,
      mode: "page",
      state: "running",
      total: 100,
    });
    const { pauseDownload } = await import("@services/offlineDictionary");
    const wrapper = await mountIt();
    expect(wrapper.text()).toContain("20 / 100");
    expect(wrapper.find("progress").attributes("value")).toBe("20");
    await wrapper.find("[data-testid=offline-dictionary-pause]").trigger("click");
    expect(pauseDownload).toHaveBeenCalledOnce();
    expect(wrapper.find("[data-testid=offline-dictionary-cancel]").exists()).toBe(true);
  });

  it("background-fetch download: no pause button, hint that it keeps running", async () => {
    $offlineDictionary.set({
      enabled: true,
      failedVersion: null,
      syncedVersion: null,
      wifiOnly: true,
    });
    $offlineDictionaryProgress.set({
      bytes: 1_500_000,
      done: 20,
      mode: "background-fetch",
      state: "running",
      total: 100,
    });
    const wrapper = await mountIt();
    expect(wrapper.find("[data-testid=offline-dictionary-pause]").exists()).toBe(false);
    expect(wrapper.text()).toContain("auch wenn du die App schließt");
  });

  it.each(["paused", "waiting", "error"] as const)(
    "%s: resume button starts manually",
    async (state) => {
      $offlineDictionary.set({
        enabled: true,
        failedVersion: null,
        syncedVersion: null,
        wifiOnly: true,
      });
      $offlineDictionaryProgress.set({ ...IDLE, state });
      const { startDownload } = await import("@services/offlineDictionary");
      const wrapper = await mountIt();
      await wrapper.find("[data-testid=offline-dictionary-resume]").trigger("click");
      expect(startDownload).toHaveBeenCalledWith({ manual: true });
    },
  );

  it("idle with a stale synced version after a failed download: shows retry, starts manually", async () => {
    $offlineDictionary.set({
      enabled: true,
      failedVersion: version,
      syncedVersion: null,
      wifiOnly: true,
    });
    $offlineDictionaryProgress.set({ ...IDLE, state: "idle" });
    const { startDownload } = await import("@services/offlineDictionary");
    const wrapper = await mountIt();
    expect(wrapper.find("[data-testid=offline-dictionary-resume]").exists()).toBe(true);
    await wrapper.find("[data-testid=offline-dictionary-resume]").trigger("click");
    expect(startDownload).toHaveBeenCalledWith({ manual: true });
  });

  it("synced for the current version: shows ready state", async () => {
    $offlineDictionary.set({
      enabled: true,
      failedVersion: null,
      syncedVersion: version,
      wifiOnly: true,
    });
    const wrapper = await mountIt();
    expect(wrapper.find("[data-testid=offline-dictionary-ready]").exists()).toBe(true);
  });

  it("emits changed when a download finishes", async () => {
    $offlineDictionary.set({
      enabled: true,
      failedVersion: null,
      syncedVersion: null,
      wifiOnly: true,
    });
    $offlineDictionaryProgress.set({ ...IDLE, mode: "page", state: "running", total: 10 });
    const wrapper = await mountIt();
    $offlineDictionaryProgress.set({ ...IDLE, done: 10, mode: "page", state: "done", total: 10 });
    await flushPromises();
    expect(wrapper.emitted("changed")).toBeTruthy();
  });

  it("persistent storage: shows state and requests on click", async () => {
    const { requestPersistentStorage } = await import("@services/storagePersistence");
    const wrapper = await mountIt();
    await wrapper.find("[data-testid=offline-dictionary-persist]").trigger("click");
    await flushPromises();
    expect(requestPersistentStorage).toHaveBeenCalledOnce();
    expect(wrapper.find("[data-testid=offline-dictionary-persist]").exists()).toBe(false);
  });
});
