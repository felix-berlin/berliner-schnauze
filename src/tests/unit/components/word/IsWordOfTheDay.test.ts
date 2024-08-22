import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";
import IsWordOfTheDay from "@components/word/IsWordOfTheDay.vue";
import { useStore } from "@nanostores/vue";
import { $wordOfTheDay } from "@stores/index.ts";
import Crown from "virtual:icons/lucide/crown";

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(),
}));

describe("IsWordOfTheDay.vue", () => {
  let mockStore;

  beforeEach(() => {
    mockStore = {
      value: {
        word: {
          ID: 1,
        },
      },
    };
    (useStore as any).mockReturnValue(mockStore);
  });

  it("renders correctly when isWordOfTheDay is true", () => {
    const wrapper = mount(IsWordOfTheDay, {
      props: {
        wordId: 1,
        word: "TestWord",
        iconSize: 24,
        tooltipPlacement: "right",
      },
      global: {
        components: {
          Crown, // Register Crown component globally
        },
      },
    });

    expect(wrapper.find(".c-word-of-the-day-crown").exists()).toBe(true);
    expect(wrapper.findComponent(Crown).exists()).toBe(true);
    expect(wrapper.find(".c-word-of-the-day-crown").classes("v-popper--has-tooltip")).toBe(true);
  });

  it("does not render when isWordOfTheDay is false", () => {
    const wrapper = mount(IsWordOfTheDay, {
      props: {
        wordId: 2,
        word: "TestWord",
        iconSize: 24,
        tooltipPlacement: "right",
      },
    });

    expect(wrapper.find(".c-word-of-the-day-crown").exists()).toBe(false);
  });

  it("renders with correct tooltip content and placement", () => {
    const wrapper = mount(IsWordOfTheDay, {
      props: {
        wordId: 1,
        word: "TestWord",
        iconSize: 24,
        tooltipPlacement: "bottom",
      },
      global: {
        components: {
          Crown, // Register Crown component globally
        },
      },
    });

    const tooltip = wrapper.vm.$el.$_popper.options._rawValue;
    expect(tooltip.content).toContain("TestWord, ist das heutige Wort des Tages");
    expect(tooltip.placement).toContain("bottom");
  });
});
