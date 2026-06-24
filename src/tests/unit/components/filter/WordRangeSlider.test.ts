import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";


vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => ({
    value: {
      rangeFilterMinMax: {
        characterLength: { min: 1, max: 20 },
        consonantsCount: { min: 0, max: 15 },
        syllablesCount: { min: 1, max: 10 },
        vowelsCount: { min: 0, max: 10 },
      },
    },
  })),
  useVModel: vi.fn(() => ({ value: undefined })),
}));

vi.mock("@stores/wordList.ts", () => ({
  $wordSearch: {},
}));

describe("WordRangeSlider.vue", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders a range input and number input", async () => {
    const WordRangeSlider = (await import("@components/filter/WordRangeSlider.vue")).default;
    const wrapper = mount(WordRangeSlider, {
      props: { label: "Zeichenanzahl", rangeType: "characterCount" },
    });
    expect(wrapper.find("input[type='range']").exists()).toBe(true);
    expect(wrapper.find("input[type='number']").exists()).toBe(true);
  });

  it("renders the legend label", async () => {
    const WordRangeSlider = (await import("@components/filter/WordRangeSlider.vue")).default;
    const wrapper = mount(WordRangeSlider, {
      props: { label: "Silbenanzahl", rangeType: "syllablesCount" },
    });
    expect(wrapper.find("legend").text()).toBe("Silbenanzahl");
  });

  it("does not show reset button when rangeValue is undefined (hasRangeSet = true)", async () => {
    const WordRangeSlider = (await import("@components/filter/WordRangeSlider.vue")).default;
    const wrapper = mount(WordRangeSlider, {
      props: { label: "Vokale", rangeType: "vowelsCount" },
    });
    expect(wrapper.find(".c-word-range-slider__reset-button").exists()).toBe(false);
  });

  it("shows reset button when a value is set", async () => {
    const { useVModel } = await import("@nanostores/vue");
    vi.mocked(useVModel).mockReturnValueOnce({ value: 5 } as ReturnType<typeof useVModel>);

    const WordRangeSlider = (await import("@components/filter/WordRangeSlider.vue")).default;
    const wrapper = mount(WordRangeSlider, {
      props: { label: "Konsonanten", rangeType: "consonantsCount" },
    });
    expect(wrapper.find(".c-word-range-slider__reset-button").exists()).toBe(true);
  });

  it("clicking reset button sets rangeValue to undefined (covers line 74)", async () => {
    const { useVModel } = await import("@nanostores/vue");
    const rangeRef = ref<number | undefined>(7);
    vi.mocked(useVModel).mockReturnValueOnce(rangeRef as ReturnType<typeof useVModel>);

    const WordRangeSlider = (await import("@components/filter/WordRangeSlider.vue")).default;
    const wrapper = mount(WordRangeSlider, {
      props: { label: "Vokale", rangeType: "vowelsCount" },
    });
    await wrapper.find(".c-word-range-slider__reset-button").trigger("click");
    expect(rangeRef.value).toBeUndefined();
  });

  it("getMinMax falls back to {max:0,min:0} when rangeFilterMinMax is null (covers ?? branch)", async () => {
    const { useStore } = await import("@nanostores/vue");
    vi.mocked(useStore).mockReturnValueOnce({ value: { rangeFilterMinMax: null } } as any);

    const WordRangeSlider = (await import("@components/filter/WordRangeSlider.vue")).default;
    const wrapper = mount(WordRangeSlider, {
      props: { label: "Zeichen", rangeType: "characterCount" },
    });
    expect(wrapper.find("input[type='range']").attributes("max")).toBe("0");
    expect(wrapper.find("input[type='range']").attributes("min")).toBe("0");
  });
});
