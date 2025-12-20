import { describe, it, expect, vi } from "vitest";
import { shallowMount, type VueWrapper } from "@vue/test-utils";
import WordTypeFilter from "@components/filter/WordTypeFilter.vue";

// Mock analytics
vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockWordSearch = {
  wordTypes: ["Substantiv", "Verb", "Adjektiv"],
  activeWordTypeFilter: ["Substantiv"],
};

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => mockWordSearch),
  useVModel: vi.fn(() => ({ value: mockWordSearch.activeWordTypeFilter })),
}));

vi.mock("@stores/index.ts", () => ({
  $wordSearch: {
    get: vi.fn(() => mockWordSearch),
  },
}));

describe("WordTypeFilter.vue", () => {
  let wrapper: VueWrapper;

  it("renders the WordTypeFilter component with Multiselect", () => {
    wrapper = shallowMount(WordTypeFilter);

    expect(wrapper.find(".c-word-type-filter").exists()).toBe(true);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    expect(multiselect.exists()).toBe(true);
  });

  it("passes correct props to Multiselect", () => {
    wrapper = shallowMount(WordTypeFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });

    const attrs = multiselect.attributes();
    expect(attrs.mode).toBe("multiple");
    expect(attrs.locale).toBe("de");
    expect(attrs.placeholder).toBe("Worttypen filtern");
  });
});
