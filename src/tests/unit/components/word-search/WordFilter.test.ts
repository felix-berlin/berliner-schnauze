import WordFilter from "@components/word-search/WordFilter.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const showWordListFilterFlyout = vi.hoisted(() => ({ value: true }));
const toggleFlyout = vi.hoisted(() => vi.fn());
const resetAll = vi.hoisted(() => vi.fn());
const startTimeout = vi.hoisted(() => vi.fn());
const outsideClick = vi.hoisted(() => ({ handler: undefined as (() => void) | undefined }));

vi.mock("@nanostores/vue", () => ({
  useStore: () => showWordListFilterFlyout,
}));

vi.mock("@stores/index.ts", () => ({
  $showWordListFilterFlyout: {},
  $toggleWordListFilterFlyout: toggleFlyout,
  resetAll,
}));

vi.mock("@vueuse/core", () => ({
  onClickOutside: (_target: unknown, handler: () => void) => {
    outsideClick.handler = handler;
  },
  useTimeout: () => ({
    ready: { value: true },
    start: startTimeout,
  }),
}));

describe("WordFilter.vue", () => {
  beforeEach(() => {
    showWordListFilterFlyout.value = true;
    outsideClick.handler = undefined;
    vi.clearAllMocks();
  });

  it("renders filter panel and headings", () => {
    const wrapper = mount(WordFilter, {
      global: {
        stubs: {
          BadgeTag: true,
          ButtonWithStates: {
            template: "<button><slot /></button>",
          },
          LetterFilter: true,
          SortWordBySelect: true,
          WordRangeSlider: true,
          WordSwitch: true,
          WordTypeFilter: true,
        },
      },
    });

    expect(wrapper.find(".c-filter-search__filter").exists()).toBe(true);
    expect(wrapper.text()).toContain("Sortiere nach:");
    expect(wrapper.text()).toContain("Filter nach:");
  });

  it("resets filters and starts button state timeout on reset click", async () => {
    const wrapper = mount(WordFilter, {
      global: {
        stubs: {
          BadgeTag: true,
          ButtonWithStates: {
            template: "<button class='reset-btn' @click='$emit(\"click\")'><slot /></button>",
          },
          LetterFilter: true,
          SortWordBySelect: true,
          WordRangeSlider: true,
          WordSwitch: true,
          WordTypeFilter: true,
        },
      },
    });

    await wrapper.get(".reset-btn").trigger("click");

    expect(resetAll).toHaveBeenCalled();
    expect(startTimeout).toHaveBeenCalled();
  });

  it("closes flyout when clicking outside and closeOnClickOutside is enabled", () => {
    mount(WordFilter, {
      global: {
        stubs: {
          BadgeTag: true,
          ButtonWithStates: true,
          LetterFilter: true,
          SortWordBySelect: true,
          WordRangeSlider: true,
          WordSwitch: true,
          WordTypeFilter: true,
        },
      },
    });

    outsideClick.handler?.();

    expect(toggleFlyout).toHaveBeenCalledTimes(1);
  });

  it("does not close on outside click when closeOnClickOutside is disabled", () => {
    mount(WordFilter, {
      props: {
        closeOnClickOutside: false,
      },
      global: {
        stubs: {
          BadgeTag: true,
          ButtonWithStates: true,
          LetterFilter: true,
          SortWordBySelect: true,
          WordRangeSlider: true,
          WordSwitch: true,
          WordTypeFilter: true,
        },
      },
    });

    outsideClick.handler?.();

    expect(toggleFlyout).not.toHaveBeenCalled();
  });
});
