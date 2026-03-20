import NoSearchResults from "@components/word-search/NoSearchResults.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchResultCount = vi.hoisted(() => ({ value: 0 }));

vi.mock("@nanostores/vue", () => ({
  useStore: () => searchResultCount.value,
}));

vi.mock("@stores/index", () => ({
  $searchResultCount: {},
}));

describe("NoSearchResults.vue", () => {
  beforeEach(() => {
    searchResultCount.value = 0;
  });

  it("shows empty-result message when no results are found", () => {
    const wrapper = mount(NoSearchResults);

    expect(wrapper.find(".c-word-search-list__no-result").exists()).toBe(true);
    expect(wrapper.text()).toContain("Keen Treffer");
  });

  it("does not render when there are search results", () => {
    searchResultCount.value = 5;

    const wrapper = mount(NoSearchResults);

    expect(wrapper.find(".c-word-search-list__no-result").exists()).toBe(false);
  });
});
