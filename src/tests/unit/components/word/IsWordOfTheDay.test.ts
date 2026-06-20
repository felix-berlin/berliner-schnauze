import IsWordOfTheDay from "@components/word/IsWordOfTheDay.vue";
import { vTooltip } from "@/directives/tooltip";
import { useStore } from "@nanostores/vue";
import { $wordOfTheDay } from "@stores/wordOfTheDay.ts";
import { mount } from "@vue/test-utils";
import Crown from "virtual:icons/lucide/crown";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

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
    HTMLElement.prototype.showPopover = vi.fn();
    HTMLElement.prototype.hidePopover = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.querySelectorAll("[popover]").forEach((el) => el.remove());
    delete (HTMLElement.prototype as any).showPopover;
    delete (HTMLElement.prototype as any).hidePopover;
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
        directives: {
          tooltip: vTooltip,
        },
      },
    });

    expect(wrapper.find(".c-word-of-the-day-crown").exists()).toBe(true);
    expect(wrapper.findComponent(Crown).exists()).toBe(true);
    // vTooltip creates a popover element in document.body
    expect(document.body.querySelector("[popover='manual']")).not.toBeNull();
    wrapper.unmount();
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
    wrapper.unmount();
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
        directives: {
          tooltip: vTooltip,
        },
      },
    });

    const tooltip = document.body.querySelector("[popover='manual']");
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toContain("TestWord, ist das heutige Wort des Tages");
    expect(tooltip?.className).toContain("c-tooltip__panel--bottom");
    wrapper.unmount();
  });
});
