import WordSearchList from "@components/word-search/WordSearchList.vue";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchResultCount = vi.hoisted(() => ({ value: 0 }));

vi.mock("@nanostores/vue", () => ({
  useStore: () => searchResultCount.value,
}));

vi.mock("@stores/index", () => ({
  $searchResultCount: {},
}));

vi.mock("vue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue")>();

  return {
    ...actual,
    defineAsyncComponent: () =>
      actual.defineComponent({
        name: "WordSuggestHint",
        template: "<div data-test='word-suggest-hint'>hint</div>",
      }),
  };
});

describe("WordSearchList.vue", () => {
  beforeEach(() => {
    searchResultCount.value = 0;
  });

  it("renders search wrapper with provided cssClass", () => {
    const wrapper = mount(WordSearchList, {
      props: {
        cssClass: "custom-class",
      },
      global: {
        stubs: {
          NoSearchResults: true,
          SearchResultCount: true,
          SearchWords: true,
          ShortcutNavigating: true,
          ShortcutSelect: true,
          WordList: true,
          WordSearchFilterToggle: true,
        },
      },
    });

    expect(wrapper.get(".c-word-search-list").attributes("role")).toBe("search");
    expect(wrapper.get(".c-word-search-list").classes()).toContain("custom-class");
  });

  it("shows suggest hint when there are no results", async () => {
    searchResultCount.value = 0;

    const wrapper = mount(WordSearchList, {
      props: {
        cssClass: "x",
      },
      global: {
        stubs: {
          NoSearchResults: true,
          SearchResultCount: true,
          SearchWords: true,
          ShortcutNavigating: true,
          ShortcutSelect: true,
          WordList: true,
          WordSearchFilterToggle: true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.find("[data-test='word-suggest-hint']").exists()).toBe(true);
  });

  it("hides suggest hint when results are available", async () => {
    searchResultCount.value = 2;

    const wrapper = mount(WordSearchList, {
      props: {
        cssClass: "x",
      },
      global: {
        stubs: {
          NoSearchResults: true,
          SearchResultCount: true,
          SearchWords: true,
          ShortcutNavigating: true,
          ShortcutSelect: true,
          WordList: true,
          WordSearchFilterToggle: true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.find("[data-test='word-suggest-hint']").exists()).toBe(false);
  });
});
