import ThemenFilter from "@components/filter/ThemenFilter.vue";
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockActiveThemenFilter = ref<string[]>([]);
const mockWordSearch = ref({
  activeThemenFilter: mockActiveThemenFilter.value,
  themen: [
    { name: "Essen & Trinken", slug: "essen-trinken" },
    { name: "Alkohol & Kneipe", slug: "alkohol-kneipe" },
  ],
});

vi.mock("@stores/wordList.ts", () => ({
  $wordSearch: {},
  $oramaSearchResults: {},
  setLetterFilter: vi.fn(),
}));

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => mockWordSearch),
  useVModel: vi.fn(() => mockActiveThemenFilter),
}));

vi.mock("@vueform/multiselect", () => ({
  default: {
    name: "Multiselect",
    props: ["modelValue", "mode", "closeOnSelect", "hideSelected", "options", "multipleLabel", "placeholder", "aria"],
    template: "<div class='mock-multiselect'><slot /></div>",
    emits: ["select", "deselect", "update:modelValue"],
  },
}));

describe("ThemenFilter.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveThemenFilter.value = [];
    mockWordSearch.value = {
      activeThemenFilter: [],
      themen: [
        { name: "Essen & Trinken", slug: "essen-trinken" },
        { name: "Alkohol & Kneipe", slug: "alkohol-kneipe" },
      ],
    };
  });

  it("renders the .c-themen-filter nav", () => {
    const wrapper = mount(ThemenFilter);
    expect(wrapper.find(".c-themen-filter").exists()).toBe(true);
  });

  it("renders the Multiselect component", () => {
    const wrapper = mount(ThemenFilter);
    expect(wrapper.findComponent({ name: "Multiselect" }).exists()).toBe(true);
  });

  it("passes mode='multiple' to Multiselect", () => {
    const wrapper = mount(ThemenFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    expect(multiselect.props("mode")).toBe("multiple");
  });

  it("passes placeholder 'Themen filtern' to Multiselect", () => {
    const wrapper = mount(ThemenFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    expect(multiselect.props("placeholder")).toBe("Themen filtern");
  });

  it("maps themen from store to {value, label} options", () => {
    const wrapper = mount(ThemenFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    expect(multiselect.props("options")).toEqual([
      { value: "essen-trinken", label: "Essen & Trinken" },
      { value: "alkohol-kneipe", label: "Alkohol & Kneipe" },
    ]);
  });

  it("calls trackEvent on select with selected values", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(ThemenFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    await multiselect.vm.$emit("select");
    expect(trackEvent).toHaveBeenCalledWith("WordList", "Filter", expect.stringContaining("Themen:"));
  });

  it("calls trackEvent on deselect with remaining values", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(ThemenFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    await multiselect.vm.$emit("deselect");
    expect(trackEvent).toHaveBeenCalledWith("WordList", "Filter", expect.stringContaining("Themen:"));
  });

  it("v-model update from Multiselect updates value ref", async () => {
    const wrapper = mount(ThemenFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    await multiselect.vm.$emit("update:modelValue", ["essen-trinken"]);
    expect(mockActiveThemenFilter.value).toEqual(["essen-trinken"]);
  });

  it("passes a multipleLabel function that returns German text", () => {
    const wrapper = mount(ThemenFilter);
    const multiselect = wrapper.findComponent({ name: "Multiselect" });
    const multipleLabel = multiselect.props("multipleLabel") as (selected: string[]) => string;
    expect(multipleLabel(["essen-trinken"])).toBe("1 Option ausgewählt");
    expect(multipleLabel(["essen-trinken", "alkohol-kneipe"])).toBe("2 Optionen ausgewählt");
  });
});
