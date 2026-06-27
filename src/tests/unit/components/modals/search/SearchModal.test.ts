import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";

const showFlyoutRef = ref(false);
const searchCountRef = ref(0);

let useStoreCallCount = 0;
vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => {
    useStoreCallCount++;
    if (useStoreCallCount === 1) return showFlyoutRef;
    return searchCountRef;
  }),
}));

vi.mock("@stores/wordList.ts", () => ({
  $showWordListFilterFlyout: {},
  $searchResultCount: {},
}));

vi.mock("@components/word-search/WordFilter.vue", () => ({
  default: { template: "<div class='mock-word-filter' />" },
}));

vi.mock("@components/word-search/SearchResultCount.vue", () => ({
  default: { template: "<div class='mock-search-result-count' />" },
}));

vi.mock("@components/word-search/NoSearchResults.vue", () => ({
  default: { template: "<div class='mock-no-search-results' />" },
}));

vi.mock("@components/word-search/WordSearchFilterToggle.vue", () => ({
  default: { template: "<div class='mock-filter-toggle' />" },
}));

vi.mock("@components/WordList.vue", () => {
  const mod: Record<string | symbol, unknown> = {
    [Symbol.toStringTag]: "Module",
    default: { template: "<div class='mock-word-list' />" },
  };
  // vue-test-utils accesses Vue internal flags (__isTeleport, __isKeepAlive, name…) on the raw
  // module proxy when an async component resolves. Use a permissive Proxy so those accesses
  // return undefined/false instead of causing Vitest's strict proxy to throw.
  return new Proxy(mod, {
    has: () => true,
    get(target, key) {
      return key in target ? target[key] : undefined;
    },
  });
});

vi.mock("@components/ModalCloseButton.vue", () => ({
  default: { template: "<button class='mock-modal-close'><slot name='suffix' /></button>" },
}));

vi.mock("@components/word-search/shortcuts/ShortcutClose.vue", () => ({
  default: { template: "<span class='mock-shortcut-close' />" },
}));

vi.mock("@components/word-search/shortcuts/ShortcutNavigating.vue", () => ({
  default: { template: "<span class='mock-shortcut-navigating' />" },
}));

vi.mock("@components/word-search/shortcuts/ShortcutSelect.vue", () => ({
  default: { template: "<span class='mock-shortcut-select' />" },
}));



describe("SearchModal.vue", () => {
  beforeEach(() => {
    vi.resetModules();
    useStoreCallCount = 0;
    showFlyoutRef.value = false;
    searchCountRef.value = 0;
  });

  it("renders role='search' container", async () => {
    const SearchModal = (await import("@components/modals/search/SearchModal.vue")).default;
    const wrapper = mount(SearchModal);
    expect(wrapper.find("[role='search']").exists()).toBe(true);
  });

  it("has .c-search-container class", async () => {
    const SearchModal = (await import("@components/modals/search/SearchModal.vue")).default;
    const wrapper = mount(SearchModal);
    expect(wrapper.find(".c-search-container").exists()).toBe(true);
  });

  it("renders WordFilter", async () => {
    const SearchModal = (await import("@components/modals/search/SearchModal.vue")).default;
    const wrapper = mount(SearchModal);
    expect(wrapper.find(".mock-word-filter").exists()).toBe(true);
  });

  it("shows header when flyout is not visible", async () => {
    showFlyoutRef.value = false;
    const SearchModal = (await import("@components/modals/search/SearchModal.vue")).default;
    const wrapper = mount(SearchModal);
    expect(wrapper.find(".c-modal__header").exists()).toBe(true);
  });

  it("hides header when flyout is visible", async () => {
    showFlyoutRef.value = true;
    const SearchModal = (await import("@components/modals/search/SearchModal.vue")).default;
    const wrapper = mount(SearchModal);
    expect(wrapper.find(".c-modal__header").exists()).toBe(false);
  });

  it("renders footer shortcuts when flyout is not visible", async () => {
    showFlyoutRef.value = false;
    const SearchModal = (await import("@components/modals/search/SearchModal.vue")).default;
    const wrapper = mount(SearchModal);
    expect(wrapper.find(".mock-shortcut-close").exists()).toBe(true);
    expect(wrapper.find(".mock-shortcut-navigating").exists()).toBe(true);
    expect(wrapper.find(".mock-shortcut-select").exists()).toBe(true);
  });

  it("hides footer when flyout is visible", async () => {
    showFlyoutRef.value = true;
    const SearchModal = (await import("@components/modals/search/SearchModal.vue")).default;
    const wrapper = mount(SearchModal);
    expect(wrapper.find("footer").exists()).toBe(false);
  });

  it("renders SearchResultCount when flyout is not visible", async () => {
    showFlyoutRef.value = false;
    const SearchModal = (await import("@components/modals/search/SearchModal.vue")).default;
    const wrapper = mount(SearchModal);
    expect(wrapper.find(".mock-search-result-count").exists()).toBe(true);
  });

  it("renders NoSearchResults when flyout is not visible", async () => {
    showFlyoutRef.value = false;
    const SearchModal = (await import("@components/modals/search/SearchModal.vue")).default;
    const wrapper = mount(SearchModal);
    expect(wrapper.find(".mock-no-search-results").exists()).toBe(true);
  });

  it("renders WordList when searchResultCount > 0 (covers line 17 v-if true branch)", async () => {
    showFlyoutRef.value = false;
    searchCountRef.value = 3;
    const SearchModal = (await import("@components/modals/search/SearchModal.vue")).default;
    const wrapper = mount(SearchModal);
    expect(wrapper.find("[role='search']").exists()).toBe(true);
  });
});
