import SearchResultCount from "@components/word-search/SearchResultCount.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchResultCount = vi.hoisted(() => ({ value: 0 }));

vi.mock("@nanostores/vue", () => ({
  useStore: () => searchResultCount.value,
}));

vi.mock("@stores/index", () => ({
  $searchResultCount: {},
}));

describe("SearchResultCount.vue", () => {
  beforeEach(() => {
    searchResultCount.value = 0;
  });

  it("renders singular label for one result", () => {
    searchResultCount.value = 1;

    const wrapper = mount(SearchResultCount);

    expect(wrapper.text()).toContain("1 Ergebnis");
  });

  it("renders plural label for multiple results", () => {
    searchResultCount.value = 3;

    const wrapper = mount(SearchResultCount);

    expect(wrapper.text()).toContain("3 Ergebnisse");
  });
});
