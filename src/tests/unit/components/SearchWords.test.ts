import { mount } from "@vue/test-utils";
import { ref, nextTick } from "vue";
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

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useDebounceFn: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
  };
});

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
    vi.clearAllMocks();
    searchLengthRef.value = 0;
    localSearchRef.value = "";
    oramaResultsRef.value = { state: "loading" } as any;
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

  it("clicking button when searchLength > 0 resets localSearch", async () => {
    searchLengthRef.value = 3;
    localSearchRef.value = "Kiez";
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    await wrapper.find("button").trigger("click");
    expect(localSearchRef.value).toBe("");
  });

  it("clicking button when searchLength is 0 does not reset search", async () => {
    searchLengthRef.value = 0;
    localSearchRef.value = "";
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    await wrapper.find("button").trigger("click");
    expect(localSearchRef.value).toBe("");
  });

  it("input event tracks search immediately when oramaResults is ready", async () => {
    const { setMatomoSearch } = await import("@utils/analytics");
    oramaResultsRef.value = { state: "ready", value: { count: 2 } } as any;
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    // setValue sets the DOM value and triggers v-model + @input
    await wrapper.find("input").setValue("Schnauze");
    await nextTick();
    expect(setMatomoSearch).toHaveBeenCalledWith("Schnauze", "Word Search", 2);
  });

  it("input event sets pendingTrackSearch when loading, fires setMatomoSearch on ready", async () => {
    const { setMatomoSearch } = await import("@utils/analytics");
    oramaResultsRef.value = { state: "loading" } as any;
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    await wrapper.find("input").setValue("Kiez");
    await nextTick();
    expect(setMatomoSearch).not.toHaveBeenCalled();
    // Transition to ready — watcher fires and flushes pendingTrackSearch
    oramaResultsRef.value = { state: "ready", value: { count: 1 } } as any;
    await nextTick();
    expect(setMatomoSearch).toHaveBeenCalledWith("Kiez", "Word Search", 1);
    wrapper.unmount();
  });

  it("watcher is a no-op when state is ready but pendingTrackSearch is null (covers line 65 false branch)", async () => {
    const { setMatomoSearch } = await import("@utils/analytics");
    oramaResultsRef.value = { state: "loading" } as any;
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    // Transition directly to ready without any pending search → watcher fires, if-body skipped
    oramaResultsRef.value = { state: "ready", value: { count: 0 } } as any;
    await nextTick();
    expect(setMatomoSearch).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("autoFocus prop focuses the search input on mount", async () => {
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords, {
      props: { autoFocus: true },
      attachTo: document.body,
    });
    await nextTick();
    expect(document.activeElement).toBe(wrapper.find("input").element);
    wrapper.unmount();
  });

  it("focusSearchInput exposed method focuses the input", async () => {
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords, { attachTo: document.body });
    (wrapper.vm as { focusSearchInput: () => void }).focusSearchInput();
    await nextTick();
    expect(document.activeElement).toBe(wrapper.find("input").element);
    wrapper.unmount();
  });

  it("watcher short-circuits when state transitions to non-ready (covers line 65 && left false branch)", async () => {
    const { setMatomoSearch } = await import("@utils/analytics");
    oramaResultsRef.value = { state: "ready", value: { count: 0 } } as any;
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords);
    vi.clearAllMocks();
    oramaResultsRef.value = { state: "loading" } as any;
    await nextTick();
    expect(setMatomoSearch).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("focusSearchInput is a no-op when searchInput ref is null after unmount (covers line 109 false branch)", async () => {
    const SearchWords = (await import("@components/SearchWords.vue")).default;
    const wrapper = mount(SearchWords, { attachTo: document.body });
    const vm = wrapper.vm as { focusSearchInput: () => void };
    wrapper.unmount();
    expect(() => vm.focusSearchInput()).not.toThrow();
  });
});
