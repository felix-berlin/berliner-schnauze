import NoSearchResults from "@components/word-search/NoSearchResults.vue";
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

describe("NoSearchResults.vue", () => {
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

  it("shows .c-word-search-list__no-result when ready and count is 0", () => {
    const wrapper = mount(NoSearchResults);
    expect(wrapper.find(".c-word-search-list__no-result").exists()).toBe(true);
  });

  it("hides .c-word-search-list__no-result when count is 1", () => {
    searchResultCountRef.value = 1;
    const wrapper = mount(NoSearchResults);
    expect(wrapper.find(".c-word-search-list__no-result").exists()).toBe(false);
  });

  it("hides .c-word-search-list__no-result while state is loading even with count 0", () => {
    searchStateRef.value = "loading";
    const wrapper = mount(NoSearchResults);
    expect(wrapper.find(".c-word-search-list__no-result").exists()).toBe(false);
  });

  it("hides .c-word-search-list__no-result when state is failed", () => {
    searchStateRef.value = "failed";
    const wrapper = mount(NoSearchResults);
    expect(wrapper.find(".c-word-search-list__no-result").exists()).toBe(false);
  });

  it("shows Keen Treffer text when ready and count is 0", () => {
    const wrapper = mount(NoSearchResults);
    expect(wrapper.text()).toContain("Keen Treffer");
  });
});
