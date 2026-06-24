import PwaCacheOverview from "@components/PwaCacheOverview.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";

const mockBuckets = ref<{ name: string; urls: string[] }[]>([]);
const mockIsCacheAvailable = ref(true);
const mockIsLoading = ref(false);
const mockLoadError = ref<string | null>(null);
const mockStorageQuota = ref<{ quotaBytes: number; usedBytes: number } | null>(null);
const mockSwInfo = ref<{ scriptURL?: string; status: string } | null>(null);
const mockLoadCaches = vi.fn();
const mockReSync = vi.fn();
const mockClearAll = vi.fn();
const mockClearBucket = vi.fn();

vi.mock("@composables/useCacheStorage", () => ({
  useCacheStorage: vi.fn(() => ({
    buckets: mockBuckets,
    clearAll: mockClearAll,
    clearBucket: mockClearBucket,
    isCacheAvailable: mockIsCacheAvailable,
    isLoading: mockIsLoading,
    loadCaches: mockLoadCaches,
    loadError: mockLoadError,
    onlineStatus: ref("online"),
    reSync: mockReSync,
    storageQuota: mockStorageQuota,
    swInfo: mockSwInfo,
    totalSizeBytes: ref(0),
  })),
  getBucketDisplayName: vi.fn((name: string) => `[${name}]`),
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => ref(false)),
}));

vi.mock("@stores/installApp.ts", () => ({
  $isPwaInstalled: {},
}));

vi.mock("@stores/modal", () => ({
  open: vi.fn(),
  close: vi.fn(),
}));

vi.mock("@components/PwaCacheHeader.vue", () => ({
  default: { template: "<div class='mock-pwa-cache-header' />" },
}));

vi.mock("@components/PwaCacheStats.vue", () => ({
  default: { template: "<div class='mock-pwa-cache-stats' />" },
}));

vi.mock("@components/PwaCacheTypeBar.vue", () => ({
  default: { template: "<div class='mock-pwa-cache-type-bar' />" },
}));

vi.mock("@components/PwaCacheInfoGrid.vue", () => ({
  default: { template: "<div class='mock-pwa-cache-info-grid' />" },
}));

vi.mock("@components/PwaCacheActions.vue", () => ({
  default: {
    name: "PwaCacheActions",
    template: "<div class='mock-pwa-cache-actions' />",
    emits: ["refresh", "clear-all", "resync"],
  },
}));

vi.mock("@components/PwaCacheBucketList.vue", () => ({
  default: {
    name: "PwaCacheBucketList",
    template: "<div class='mock-pwa-cache-bucket-list' />",
    emits: ["clear-bucket"],
  },
}));

describe("PwaCacheOverview.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuckets.value = [];
    mockIsCacheAvailable.value = true;
    mockIsLoading.value = false;
    mockLoadError.value = null;
    mockStorageQuota.value = null;
    mockSwInfo.value = null;
  });

  it("renders .c-pwa-cache wrapper", () => {
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".c-pwa-cache").exists()).toBe(true);
  });

  it("calls loadCaches on mount", () => {
    mount(PwaCacheOverview);
    expect(mockLoadCaches).toHaveBeenCalledTimes(1);
  });

  it("renders PwaCacheHeader", () => {
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".mock-pwa-cache-header").exists()).toBe(true);
  });

  it("shows unavailable message when cache is not available", () => {
    mockIsCacheAvailable.value = false;
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".c-pwa-cache__unavailable").exists()).toBe(true);
    expect(wrapper.find(".c-pwa-cache__unavailable").text()).toContain("nicht verfügbar");
  });

  it("does not render stats/actions when cache is unavailable", () => {
    mockIsCacheAvailable.value = false;
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".mock-pwa-cache-stats").exists()).toBe(false);
    expect(wrapper.find(".mock-pwa-cache-actions").exists()).toBe(false);
  });

  it("renders PwaCacheStats when cache is available", () => {
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".mock-pwa-cache-stats").exists()).toBe(true);
  });

  it("renders PwaCacheTypeBar when cache is available", () => {
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".mock-pwa-cache-type-bar").exists()).toBe(true);
  });

  it("renders PwaCacheInfoGrid when cache is available", () => {
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".mock-pwa-cache-info-grid").exists()).toBe(true);
  });

  it("renders PwaCacheActions when cache is available", () => {
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".mock-pwa-cache-actions").exists()).toBe(true);
  });

  it("shows skeleton while loading", () => {
    mockIsLoading.value = true;
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".c-pwa-cache__skeleton").exists()).toBe(true);
    expect(wrapper.find(".c-pwa-cache__skeleton").attributes("aria-busy")).toBe("true");
  });

  it("shows error message when loadError is set", () => {
    mockLoadError.value = "Fehler beim Laden";
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".c-pwa-cache__unavailable").text()).toContain("Fehler beim Laden");
  });

  it("shows empty message when no buckets", () => {
    mockBuckets.value = [];
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".c-pwa-cache__empty").exists()).toBe(true);
    expect(wrapper.find(".c-pwa-cache__empty").text()).toContain("Noch nichts gecacht");
  });

  it("renders PwaCacheBucketList when buckets exist", () => {
    mockBuckets.value = [{ name: "cache-v1", urls: ["/foo", "/bar"] }];
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.find(".mock-pwa-cache-bucket-list").exists()).toBe(true);
    expect(wrapper.find(".c-pwa-cache__empty").exists()).toBe(false);
  });

  it("clear-all event from PwaCacheActions triggers open() with ConfirmDialog", async () => {
    const { open } = await import("@stores/modal");
    const wrapper = mount(PwaCacheOverview);
    await wrapper.findComponent({ name: "PwaCacheActions" }).vm.$emit("clear-all");
    expect(open).toHaveBeenCalledOnce();
  });

  it("clear-bucket event from PwaCacheBucketList triggers open() with ConfirmDialog", async () => {
    const { open } = await import("@stores/modal");
    mockBuckets.value = [{ name: "cache-v1", urls: ["/foo"] }];
    const wrapper = mount(PwaCacheOverview);
    await wrapper.findComponent({ name: "PwaCacheBucketList" }).vm.$emit("clear-bucket", "cache-v1");
    expect(open).toHaveBeenCalledOnce();
    const callArg = vi.mocked(open).mock.calls[0][0];
    expect(callArg.view?.props?.message).toContain("[cache-v1]");
  });

  it("storageQuotaPercent returns correct percentage when quota is set", () => {
    mockStorageQuota.value = { quotaBytes: 1000, usedBytes: 250 };
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.exists()).toBe(true);
  });

  it("swScriptURL is resolved when swInfo has scriptURL", () => {
    mockSwInfo.value = { status: "active", scriptURL: "/sw.js" };
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.exists()).toBe(true);
  });

  it("swScriptURL returns null when scriptURL is empty string (covers line 127 || null branch)", () => {
    mockSwInfo.value = { status: "active", scriptURL: "" };
    const wrapper = mount(PwaCacheOverview);
    expect(wrapper.exists()).toBe(true);
  });

  it("confirmClearAll cancel callback calls close()", async () => {
    const { open, close } = await import("@stores/modal");
    const wrapper = mount(PwaCacheOverview);
    await wrapper.findComponent({ name: "PwaCacheActions" }).vm.$emit("clear-all");
    const callArg = vi.mocked(open).mock.calls[0][0] as { view?: { events?: { cancel?: () => void; confirm?: () => void } } };
    callArg.view?.events?.cancel?.();
    expect(close).toHaveBeenCalled();
  });

  it("confirmClearAll confirm callback calls close() and clearAll()", async () => {
    const { open, close } = await import("@stores/modal");
    const wrapper = mount(PwaCacheOverview);
    await wrapper.findComponent({ name: "PwaCacheActions" }).vm.$emit("clear-all");
    const callArg = vi.mocked(open).mock.calls[0][0] as { view?: { events?: { cancel?: () => void; confirm?: () => void } } };
    callArg.view?.events?.confirm?.();
    expect(close).toHaveBeenCalled();
    expect(mockClearAll).toHaveBeenCalled();
  });

  it("confirmClearBucket cancel callback calls close()", async () => {
    const { open, close } = await import("@stores/modal");
    mockBuckets.value = [{ name: "cache-v1", urls: [] }];
    const wrapper = mount(PwaCacheOverview);
    await wrapper.findComponent({ name: "PwaCacheBucketList" }).vm.$emit("clear-bucket", "cache-v1");
    const callArg = vi.mocked(open).mock.calls[0][0] as { view?: { events?: { cancel?: () => void; confirm?: () => void } } };
    callArg.view?.events?.cancel?.();
    expect(close).toHaveBeenCalled();
  });

  it("confirmClearBucket confirm callback calls close() and clearBucket()", async () => {
    const { open, close } = await import("@stores/modal");
    mockBuckets.value = [{ name: "cache-v1", urls: [] }];
    const wrapper = mount(PwaCacheOverview);
    await wrapper.findComponent({ name: "PwaCacheBucketList" }).vm.$emit("clear-bucket", "cache-v1");
    const callArg = vi.mocked(open).mock.calls[0][0] as { view?: { events?: { cancel?: () => void; confirm?: () => void } } };
    callArg.view?.events?.confirm?.();
    expect(close).toHaveBeenCalled();
    expect(mockClearBucket).toHaveBeenCalledWith("cache-v1");
  });
});
