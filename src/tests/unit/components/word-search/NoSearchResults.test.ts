import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("@stores/wordList.ts", () => ({ $searchResultCount: {} }));

const searchResultCountRef = ref(0);

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => searchResultCountRef),
}));

describe("NoSearchResults.vue", () => {
  it("shows .c-word-search-list__no-result when count is 0", async () => {
    searchResultCountRef.value = 0;
    const NoSearchResults = (await import("@components/word-search/NoSearchResults.vue")).default;
    const wrapper = mount(NoSearchResults);
    expect(wrapper.find(".c-word-search-list__no-result").exists()).toBe(true);
  });

  it("hides .c-word-search-list__no-result when count is 1", async () => {
    searchResultCountRef.value = 1;
    const NoSearchResults = (await import("@components/word-search/NoSearchResults.vue")).default;
    const wrapper = mount(NoSearchResults);
    expect(wrapper.find(".c-word-search-list__no-result").exists()).toBe(false);
  });

  it("shows Keen Treffer text when count is 0", async () => {
    searchResultCountRef.value = 0;
    const NoSearchResults = (await import("@components/word-search/NoSearchResults.vue")).default;
    const wrapper = mount(NoSearchResults);
    expect(wrapper.text()).toContain("Keen Treffer");
  });
});
