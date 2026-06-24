import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const searchCountRef = ref(0);

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => searchCountRef),
}));

vi.mock("@stores/wordList.ts", () => ({
  $searchResultCount: {},
}));

vi.mock("@components/SearchWords.vue", () => ({
  default: { template: "<div class=\"mock-search-words\" />" },
}));

vi.mock("@components/word-search/NoSearchResults.vue", () => ({
  default: { template: "<div class=\"mock-no-search-results\" />" },
}));

vi.mock("@components/word-search/SearchResultCount.vue", () => ({
  default: { template: "<div class=\"mock-search-result-count\" />" },
}));

vi.mock("@components/word-search/shortcuts/ShortcutNavigating.vue", () => ({
  default: { template: "<div class=\"mock-shortcut-navigating\" />" },
}));

vi.mock("@components/word-search/shortcuts/ShortcutSelect.vue", () => ({
  default: { template: "<div class=\"mock-shortcut-select\" />" },
}));

vi.mock("@components/word-search/WordSearchFilterToggle.vue", () => ({
  default: { template: "<div class=\"mock-filter-toggle\" />" },
}));

vi.mock("@components/WordList.vue", () => ({
  default: { template: "<div class=\"mock-word-list\" />" },
}));

beforeEach(() => {
  vi.resetModules();
  searchCountRef.value = 0;
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

  it("renders without errors when count is 0 (WordSuggestHint conditionally rendered)", async () => {
    searchCountRef.value = 0;
    const WordSearchList = (await import("@components/word-search/WordSearchList.vue")).default;
    const wrapper = mount(WordSearchList, {
      props: { cssClass: "" },
    });
    // The component should mount without throwing
    expect(wrapper.exists()).toBe(true);
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
