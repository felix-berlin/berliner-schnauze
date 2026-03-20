import WordSearchFilterToggle from "@components/word-search/WordSearchFilterToggle.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const activeFilterCount = vi.hoisted(() => ({ value: 0 }));
const toggleFlyout = vi.hoisted(() => vi.fn());

vi.mock("@nanostores/vue", () => ({
  useStore: () => activeFilterCount.value,
}));

vi.mock("@stores/index.ts", () => ({
  $activeFilterCount: {},
  $toggleWordListFilterFlyout: toggleFlyout,
}));

describe("WordSearchFilterToggle.vue", () => {
  beforeEach(() => {
    activeFilterCount.value = 0;
    vi.clearAllMocks();
  });

  it("shows active filter counter when count is greater than zero", () => {
    activeFilterCount.value = 4;

    const wrapper = mount(WordSearchFilterToggle);

    expect(wrapper.find(".c-word-search-filter-toggle__counter").exists()).toBe(true);
    expect(wrapper.text()).toContain("4");
  });

  it("calls flyout toggle on click", async () => {
    const wrapper = mount(WordSearchFilterToggle);

    await wrapper.get("button").trigger("click");

    expect(toggleFlyout).toHaveBeenCalledTimes(1);
  });
});
