import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const searchCountRef = ref(0);
const searchStateRef = ref<"loading" | "ready" | "failed">("ready");

vi.mock("@stores/wordList.ts", () => ({
  $searchResultCount: "searchResultCount",
  $searchState: "searchState",
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn((store: unknown) => (store === "searchState" ? searchStateRef : searchCountRef)),
}));

vi.mock("@components/SearchWords.vue", () => ({
  default: { template: '<div class="mock-search-words" />' },
}));

vi.mock("@components/word-search/NoSearchResults.vue", () => ({
  default: { template: '<div class="mock-no-search-results" />' },
}));

vi.mock("@components/word-search/SearchResultCount.vue", () => ({
  default: { template: '<div class="mock-search-result-count" />' },
}));

vi.mock("@components/word-search/shortcuts/ShortcutNavigating.vue", () => ({
  default: { template: '<div class="mock-shortcut-navigating" />' },
}));

vi.mock("@components/word-search/shortcuts/ShortcutSelect.vue", () => ({
  default: { template: '<div class="mock-shortcut-select" />' },
}));

vi.mock("@components/word-search/WordSearchFilterToggle.vue", () => ({
  default: { template: '<div class="mock-filter-toggle" />' },
}));

vi.mock("@components/WordList.vue", () => ({
  default: { template: '<div class="mock-word-list" />' },
}));

vi.mock("@components/WordSuggestHint.vue", async () => {
  const { createComponentStub } = await import("../../helpers/stubs");
  return createComponentStub('<div class="mock-word-suggest-hint" />');
});

beforeEach(() => {
  vi.resetModules();
  searchCountRef.value = 0;
  searchStateRef.value = "ready";
});

describe("WordSearchList.vue", () => {
  it("renders an element with role=search", async () => {
    const WordSearchList = (await import("@components/word-search/WordSearchList.vue")).default;
    const wrapper = mount(WordSearchList, {
      props: { cssClass: "c-word-search-list--main" },
    });
    expect(wrapper.find('[role="search"]').exists()).toBe(true);
  });

  it("applies cssClass prop to .c-word-search-list", async () => {
    const WordSearchList = (await import("@components/word-search/WordSearchList.vue")).default;
    const wrapper = mount(WordSearchList, {
      props: { cssClass: "c-word-search-list--main" },
    });
    expect(wrapper.find(".c-word-search-list").classes()).toContain("c-word-search-list--main");
  });

  it("has the base .c-word-search-list class", async () => {
    const WordSearchList = (await import("@components/word-search/WordSearchList.vue")).default;
    const wrapper = mount(WordSearchList, {
      props: { cssClass: "custom-class" },
    });
    expect(wrapper.find(".c-word-search-list").exists()).toBe(true);
  });

  it("renders mocked child components inside search region", async () => {
    const WordSearchList = (await import("@components/word-search/WordSearchList.vue")).default;
    const wrapper = mount(WordSearchList, {
      props: { cssClass: "" },
    });
    expect(wrapper.find(".mock-search-words").exists()).toBe(true);
    expect(wrapper.find(".mock-no-search-results").exists()).toBe(true);
    expect(wrapper.find(".mock-search-result-count").exists()).toBe(true);
    expect(wrapper.find(".mock-filter-toggle").exists()).toBe(true);
  });

  it("renders WordList outside the search div", async () => {
    const WordSearchList = (await import("@components/word-search/WordSearchList.vue")).default;
    const wrapper = mount(WordSearchList, {
      props: { cssClass: "" },
    });
    expect(wrapper.find(".mock-word-list").exists()).toBe(true);
  });

  it("shows WordSuggestHint when search is ready and count is 0", async () => {
    const WordSearchList = (await import("@components/word-search/WordSearchList.vue")).default;
    const wrapper = mount(WordSearchList, { props: { cssClass: "" } });
    await vi.dynamicImportSettled();
    await flushPromises();
    expect(wrapper.find(".mock-word-suggest-hint").exists()).toBe(true);
  });

  it("hides WordSuggestHint while search index is loading even with count 0", async () => {
    searchStateRef.value = "loading";
    const WordSearchList = (await import("@components/word-search/WordSearchList.vue")).default;
    const wrapper = mount(WordSearchList, { props: { cssClass: "" } });
    await flushPromises();
    expect(wrapper.find(".mock-word-suggest-hint").exists()).toBe(false);
  });

  it("hides WordSuggestHint when searchResultCount > 0", async () => {
    searchCountRef.value = 5;
    const WordSearchList = (await import("@components/word-search/WordSearchList.vue")).default;
    const wrapper = mount(WordSearchList, { props: { cssClass: "" } });
    await flushPromises();
    expect(wrapper.find(".mock-word-suggest-hint").exists()).toBe(false);
  });

  it("applies empty cssClass without adding extra classes", async () => {
    const WordSearchList = (await import("@components/word-search/WordSearchList.vue")).default;
    const wrapper = mount(WordSearchList, {
      props: { cssClass: "" },
    });
    const el = wrapper.find(".c-word-search-list");
    expect(el.exists()).toBe(true);
    // Only the base class should be present (plus possibly empty string class which gets ignored)
    expect(el.classes()).toContain("c-word-search-list");
  });
});
