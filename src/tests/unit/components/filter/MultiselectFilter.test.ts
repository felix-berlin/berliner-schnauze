import MultiselectFilter from "@components/filter/MultiselectFilter.vue";
import { useVModel } from "@nanostores/vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("@utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockWordSearch = vi.hoisted(() => ({}));
const mockValue = ref<string[]>([]);

vi.mock("@stores/wordList.ts", () => ({
  $wordSearch: mockWordSearch,
}));

vi.mock("@nanostores/vue", () => ({
  useVModel: vi.fn(() => mockValue),
}));

vi.mock("@vueform/multiselect", () => ({
  default: {
    emits: ["select", "deselect", "update:modelValue"],
    name: "Multiselect",
    props: [
      "modelValue",
      "mode",
      "closeOnSelect",
      "hideSelected",
      "options",
      "locale",
      "fallbackLocale",
      "multipleLabel",
      "placeholder",
      "aria",
    ],
    template: "<div class='mock-multiselect'><slot /></div>",
  },
}));

const themenOptions = [
  { label: "Essen & Trinken", value: "essen-trinken" },
  { label: "Alkohol & Kneipe", value: "alkohol-kneipe" },
];

const mountFilter = (props: Partial<InstanceType<typeof MultiselectFilter>["$props"]> = {}) =>
  mount(MultiselectFilter, {
    props: {
      label: "Themen filtern",
      options: themenOptions,
      storeKey: "activeThemenFilter",
      trackLabel: "Themen",
      ...props,
    },
  });

describe("MultiselectFilter.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValue.value = [];
  });

  it("binds the given store key via useVModel", () => {
    mountFilter({ storeKey: "activeWordTypeFilter" });
    expect(useVModel).toHaveBeenCalledWith(mockWordSearch, "activeWordTypeFilter");
  });

  it("renders a multiple-mode Multiselect", () => {
    const multiselect = mountFilter().findComponent({ name: "Multiselect" });
    expect(multiselect.exists()).toBe(true);
    expect(multiselect.props("mode")).toBe("multiple");
  });

  it("uses label as placeholder and aria-label", () => {
    const multiselect = mountFilter({ label: "Worttypen filtern" }).findComponent({
      name: "Multiselect",
    });
    expect(multiselect.props("placeholder")).toBe("Worttypen filtern");
    expect(multiselect.props("aria")).toMatchObject({ "aria-label": "Worttypen filtern" });
  });

  it("passes object options through", () => {
    const multiselect = mountFilter().findComponent({ name: "Multiselect" });
    expect(multiselect.props("options")).toEqual(themenOptions);
  });

  it("passes string options through", () => {
    const options = ["Substantiv", "Verb"];
    const multiselect = mountFilter({ options }).findComponent({ name: "Multiselect" });
    expect(multiselect.props("options")).toEqual(options);
  });

  it.each(["select", "deselect"])("tracks %s with the trackLabel prefix", async (event) => {
    const { trackEvent } = await import("@utils/analytics");
    mockValue.value = ["verb", "nomen"];
    const multiselect = mountFilter({ trackLabel: "Word Type" }).findComponent({
      name: "Multiselect",
    });
    await multiselect.vm.$emit(event);
    expect(trackEvent).toHaveBeenCalledWith("WordList", "Filter", "Word Type: verb, nomen");
  });

  it("v-model update from Multiselect writes the store-bound ref", async () => {
    const multiselect = mountFilter().findComponent({ name: "Multiselect" });
    await multiselect.vm.$emit("update:modelValue", ["essen-trinken"]);
    expect(mockValue.value).toEqual(["essen-trinken"]);
  });

  it("multipleLabel returns German text", () => {
    const multiselect = mountFilter().findComponent({ name: "Multiselect" });
    const multipleLabel = multiselect.props("multipleLabel") as (selected: string[]) => string;
    expect(multipleLabel(["a"])).toBe("1 Option ausgewählt");
    expect(multipleLabel(["a", "b"])).toBe("2 Optionen ausgewählt");
  });
});
