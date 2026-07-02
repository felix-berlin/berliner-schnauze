import WordTypeFilter from "@components/filter/WordTypeFilter.vue";
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockActiveWordTypeFilter = ref<string[]>([]);
const mockWordSearch = ref({
  wordTypes: ["Substantiv", "Verb", "Adjektiv"],
  activeWordTypeFilter: mockActiveWordTypeFilter.value,
});

vi.mock("@stores/wordList.ts", () => ({
  $wordSearch: {},
  $oramaSearchResults: {},
  setLetterFilter: vi.fn(),
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => mockWordSearch),
  useVModel: vi.fn(() => mockActiveWordTypeFilter),
}));

vi.mock("@vueform/multiselect", () => ({
  default: {
    name: "Multiselect",
    props: ["modelValue", "mode", "closeOnSelect", "hideSelected", "options", "locale",
            "fallbackLocale", "multipleLabel", "placeholder", "aria"],
    template: "<div class='mock-multiselect'><slot /></div>",
    emits: ["select", "deselect", "update:modelValue"],
  },
}));

describe("WordTypeFilter.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveWordTypeFilter.value = [];
    mockWordSearch.value = {
      wordTypes: ["Substantiv", "Verb", "Adjektiv"],
      activeWordTypeFilter: [],
    };
  });

  it("renders the .c-word-type-filter nav", () => {
    const wrapper = mount(WordTypeFilter);
    expect(wrapper.find(".c-word-type-filter").exists()).toBe(true);
  });

  it("renders the Multiselect component", () => {
    const wrapper = mount(WordTypeFilter);
    expect(wrapper.findComponent({ name: "Multiselect" }).exists()).toBe(true);
  });

  it("passes mode='multiple' to Multiselect", () => {
    const wrapper = mount(WordTypeFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    expect(multiselect.props("mode")).toBe("multiple");
  });

  it("passes placeholder 'Worttypen filtern' to Multiselect", () => {
    const wrapper = mount(WordTypeFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    expect(multiselect.props("placeholder")).toBe("Worttypen filtern");
  });

  it("passes locale='de' to Multiselect", () => {
    const wrapper = mount(WordTypeFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    expect(multiselect.props("locale")).toBe("de");
  });

  it("passes wordTypes from store as options", () => {
    const wrapper = mount(WordTypeFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    expect(multiselect.props("options")).toEqual(["Substantiv", "Verb", "Adjektiv"]);
  });

  it("calls trackEvent on select with selected values", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(WordTypeFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    await multiselect.vm.$emit("select");
    expect(trackEvent).toHaveBeenCalledWith("WordList", "Filter", expect.stringContaining("Word Type:"));
  });

  it("calls trackEvent on deselect with remaining values", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(WordTypeFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    await multiselect.vm.$emit("deselect");
    expect(trackEvent).toHaveBeenCalledWith("WordList", "Filter", expect.stringContaining("Word Type:"));
  });

  it("v-model update from Multiselect updates value ref (covers line 4 v-model handler)", async () => {
    const wrapper = mount(WordTypeFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    await multiselect.vm.$emit("update:modelValue", ["Substantiv"]);
    expect(mockActiveWordTypeFilter.value).toEqual(["Substantiv"]);
  });

  it("passes a multipleLabel function that returns German text", () => {
    const wrapper = mount(WordTypeFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    const multipleLabel = multiselect.props("multipleLabel") as (selected: string[]) => string;
    expect(multipleLabel(["Substantiv"])).toBe("1 Option ausgewählt");
    expect(multipleLabel(["Substantiv", "Verb"])).toBe("2 Optionen ausgewählt");
  });
});
