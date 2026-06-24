import PwaCacheOverview from "@components/PwaCacheOverview.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";

const mockBuckets = ref<{ name: string; urls: string[] }[]>([]);
const mockIsCacheAvailable = ref(true);
const mockIsLoading = ref(false);
const mockLoadError = ref<string | null>(null);
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
    storageQuota: ref(null),
    swInfo: ref(null),
    totalSizeBytes: ref(0),
  })),
  getBucketDisplayName: vi.fn((name: string) => name),
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
    template: "<div class='mock-pwa-cache-actions' @click.self='$emit(\"refresh\")' />",
    emits: ["refresh", "clear-all", "resync"],
  },
}));

vi.mock("@components/PwaCacheBucketList.vue", () => ({
  default: {
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
});
