import SearchResultCount from "@components/word-search/SearchResultCount.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { createStoreMockImpl } from "../../helpers/stores";

const searchResultCountRef = ref(0);
const searchStateRef = ref<"loading" | "ready" | "failed">("ready");

vi.mock("@stores/wordList.ts", () => ({
  $searchResultCount: "searchResultCount",
  $searchState: "searchState",
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(),
}));

import { useStore } from "@nanostores/vue";
const mockedUseStore = vi.mocked(useStore);

describe("SearchResultCount.vue", () => {
  beforeEach(() => {
    searchResultCountRef.value = 0;
    searchStateRef.value = "ready";

    mockedUseStore.mockImplementation(
      createStoreMockImpl([
        ["searchResultCount", searchResultCountRef],
        ["searchState", searchStateRef],
      ]),
    );
  });

  it("renders a paragraph element when ready", () => {
    const wrapper = mount(SearchResultCount);
    expect(wrapper.find("p").exists()).toBe(true);
  });

  it("renders nothing while state is loading", () => {
    searchStateRef.value = "loading";
    const wrapper = mount(SearchResultCount);
    expect(wrapper.find("p").exists()).toBe(false);
  });

  it("renders nothing when state is failed", () => {
    searchStateRef.value = "failed";
    const wrapper = mount(SearchResultCount);
    expect(wrapper.find("p").exists()).toBe(false);
  });

  it("shows singular Ergebnis when count is 1", () => {
    searchResultCountRef.value = 1;
    const wrapper = mount(SearchResultCount);
    expect(wrapper.text()).toContain("1 Ergebnis");
    expect(wrapper.text()).not.toContain("Ergebnisse");
  });

  it("shows plural Ergebnisse when count is greater than 1", () => {
    searchResultCountRef.value = 5;
    const wrapper = mount(SearchResultCount);
    expect(wrapper.text()).toContain("5 Ergebnisse");
  });

  it("shows plural 0 Ergebnisse when count is 0", () => {
    const wrapper = mount(SearchResultCount);
    expect(wrapper.text()).toContain("0 Ergebnisse");
  });

  it("has class c-word-search-list__result-count", () => {
    const wrapper = mount(SearchResultCount);
    expect(wrapper.find(".c-word-search-list__result-count").exists()).toBe(true);
  });
});
