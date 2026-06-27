import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchResultCountRef = ref(0);

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => searchResultCountRef),
}));

vi.mock("@stores/wordList.ts", () => ({
  $searchResultCount: {},
}));

describe("SearchResultCount.vue", () => {
  beforeEach(() => {
    searchResultCountRef.value = 0;
  });

  it("renders a paragraph element", async () => {
    const SearchResultCount = (
      await import("@components/word-search/SearchResultCount.vue")
    ).default;
    const wrapper = mount(SearchResultCount);
    expect(wrapper.find("p").exists()).toBe(true);
  });

  it("shows singular Ergebnis when count is 1", async () => {
    searchResultCountRef.value = 1;
    const SearchResultCount = (
      await import("@components/word-search/SearchResultCount.vue")
    ).default;
    const wrapper = mount(SearchResultCount);
    expect(wrapper.text()).toContain("1 Ergebnis");
    expect(wrapper.text()).not.toContain("Ergebnisse");
  });

  it("shows plural Ergebnisse when count is greater than 1", async () => {
    searchResultCountRef.value = 5;
    const SearchResultCount = (
      await import("@components/word-search/SearchResultCount.vue")
    ).default;
    const wrapper = mount(SearchResultCount);
    expect(wrapper.text()).toContain("5 Ergebnisse");
  });

  it("shows 0 Ergebnis when count is 0", async () => {
    searchResultCountRef.value = 0;
    const SearchResultCount = (
      await import("@components/word-search/SearchResultCount.vue")
    ).default;
    const wrapper = mount(SearchResultCount);
    expect(wrapper.text()).toContain("0 Ergebnis");
  });

  it("has class c-word-search-list__result-count", async () => {
    const SearchResultCount = (
      await import("@components/word-search/SearchResultCount.vue")
    ).default;
    const wrapper = mount(SearchResultCount);
    expect(wrapper.find(".c-word-search-list__result-count").exists()).toBe(true);
  });
});
