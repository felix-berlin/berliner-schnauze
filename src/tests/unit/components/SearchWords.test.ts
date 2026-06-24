import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { describe, expect, it, vi, beforeEach } from "vitest";

const searchLengthRef = ref(0);
const oramaResultsRef = ref({ state: "loading" });
const localSearchRef = ref("");

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn((store) => {
    if (store === mockStores.$wordSearch || store === mockStores.currentSearchLength) {
      return searchLengthRef;
    }
    return oramaResultsRef;
  }),
  useVModel: vi.fn(() => localSearchRef),
}));

const mockStores = {
  $wordSearch: {},
  $oramaSearchResults: {},
  currentSearchLength: {},
  searchLength: {},
};

vi.mock("@stores/wordList.ts", () => ({
  $wordSearch: mockStores.$wordSearch,
  $oramaSearchResults: mockStores.$oramaSearchResults,
  searchLength: mockStores.currentSearchLength,
}));

vi.mock("@utils/analytics", () => ({
  setMatomoSearch: vi.fn(),
}));

vi.mock("virtual:icons/lucide/search", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, default: { template: "<span />" } };
});

vi.mock("virtual:icons/lucide/x", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, default: { template: "<span />" } };
});

describe("SearchWords.vue", () => {
  beforeEach(() => {
    searchLengthRef.value = 0;
    localSearchRef.value = "";
    oramaResultsRef.value = { state: "loading" };
  });

  it("renders the search input", async () => {
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    expect(wrapper.find("input#wordSearch").exists()).toBe(true);
  });

  it("input has correct aria-label", async () => {
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    expect(wrapper.find("input").attributes("aria-label")).toBe("Suche nach einem Berliner Word");
  });

  it("input has placeholder text", async () => {
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    expect(wrapper.find("input").attributes("placeholder")).toBe("Durchsuche den Berliner-Jargon");
  });

  it("renders a search button", async () => {
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("button aria-label says betätigen when search is empty", async () => {
    searchLengthRef.value = 0;
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    expect(wrapper.find("button").attributes("aria-label")).toBe("Wortsuche betätigen");
  });

  it("button aria-label says löschen when search has content", async () => {
    searchLengthRef.value = 3;
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    expect(wrapper.find("button").attributes("aria-label")).toBe("Wortsuche löschen");
  });

  it("applies default buttonPosition left class", async () => {
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    expect(wrapper.find("button").classes()).toContain("c-word-search__search-button--left");
  });

  it("applies right buttonPosition class when passed as prop", async () => {
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords, { props: { buttonPosition: "right" } });
    expect(wrapper.find("button").classes()).toContain("c-word-search__search-button--right");
  });
});
