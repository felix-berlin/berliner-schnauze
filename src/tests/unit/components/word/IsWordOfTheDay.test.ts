import IsWordOfTheDay from "@components/word/IsWordOfTheDay.vue";
import { useStore } from "@nanostores/vue";
import { mount } from "@vue/test-utils";
import Crown from "virtual:icons/lucide/crown";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { vTooltip } from "@/directives/tooltip";

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

  it("renders correctly when isWordOfTheDay is true", async () => {
    const wrapper = mount(IsWordOfTheDay, {
      global: {
        components: {
          Crown, // Register Crown component globally
        },
        directives: {
          tooltip: vTooltip,
        },
      },
      props: {
        iconSize: 24,
        tooltipPlacement: "right",
        word: "TestWord",
        wordId: 1,
      },
    });

    expect(wrapper.find(".c-word-of-the-day-crown").exists()).toBe(true);
    expect(wrapper.findComponent(Crown).exists()).toBe(true);
    // vTooltip lazily adds the panel to body on first show
    await wrapper.find("[aria-describedby]").trigger("pointerenter");
    expect(document.body.querySelector("[popover='manual']")).not.toBeNull();
    wrapper.unmount();
  });

  it("does not render when isWordOfTheDay is false", () => {
    const wrapper = mount(IsWordOfTheDay, {
      props: {
        iconSize: 24,
        tooltipPlacement: "right",
        word: "TestWord",
        wordId: 2,
      },
    });

    expect(wrapper.find(".c-word-of-the-day-crown").exists()).toBe(false);
    wrapper.unmount();
  });

  it("renders with correct tooltip content and placement", async () => {
    const wrapper = mount(IsWordOfTheDay, {
      global: {
        components: {
          Crown, // Register Crown component globally
        },
        directives: {
          tooltip: vTooltip,
        },
      },
      props: {
        iconSize: 24,
        tooltipPlacement: "bottom",
        word: "TestWord",
        wordId: 1,
      },
    });

    await wrapper.find("[aria-describedby]").trigger("pointerenter");
    const tooltip = document.body.querySelector("[popover='manual']");
    expect(tooltip).not.toBeNull();
    expect(tooltip?.textContent).toContain("TestWord, ist das heutige Wort des Tages");
    expect(tooltip?.className).toContain("c-tooltip__panel--bottom");
    wrapper.unmount();
  });

  it("renders badge variant with crown icon and text when isWordOfTheDay is true", () => {
    const wrapper = mount(IsWordOfTheDay, {
      global: {
        components: { Crown },
      },
      props: {
        variant: "badge",
        word: "TestWord",
        wordId: 1,
      },
    });

    const badge = wrapper.find(".c-word-hero__wotd-badge");
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain("Wort des Tages");
    expect(wrapper.findComponent(Crown).exists()).toBe(true);
    expect(wrapper.find(".c-word-of-the-day-crown").exists()).toBe(false);
    wrapper.unmount();
  });

  it("does not render badge variant when isWordOfTheDay is false", () => {
    const wrapper = mount(IsWordOfTheDay, {
      props: {
        variant: "badge",
        word: "TestWord",
        wordId: 2,
      },
    });

    expect(wrapper.find(".c-word-hero__wotd-badge").exists()).toBe(false);
    wrapper.unmount();
  });
});
