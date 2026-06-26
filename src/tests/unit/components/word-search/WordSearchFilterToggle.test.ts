import { mount } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const activeFilterCountRef = ref(0);
const mockToggle = vi.fn();

vi.mock("@nanostores/vue", () => ({
  useStore: vi.fn(() => activeFilterCountRef),
}));

vi.mock("@stores/wordList.ts", () => ({
  $activeFilterCount: {},
  $toggleWordListFilterFlyout: mockToggle,
}));

describe("WordSearchFilterToggle.vue", () => {
  beforeEach(() => {
    activeFilterCountRef.value = 0;
    mockToggle.mockClear();
  });

  it("renders a button with aria-label Filter öffnen", async () => {
    const WordSearchFilterToggle = (
      await import("@components/word-search/WordSearchFilterToggle.vue")
    ).default;
    const wrapper = mount(WordSearchFilterToggle);
    const btn = wrapper.find("button");
    expect(btn.exists()).toBe(true);
    expect(btn.attributes("aria-label")).toBe("Filter öffnen");
  });

  it("renders Filter text", async () => {
    const WordSearchFilterToggle = (
      await import("@components/word-search/WordSearchFilterToggle.vue")
    ).default;
    const wrapper = mount(WordSearchFilterToggle);
    expect(wrapper.find(".c-word-search-filter-toggle__text").text()).toContain("Filter");
  });

  it("does not show counter badge when activeFilterCount is 0", async () => {
    activeFilterCountRef.value = 0;
    const WordSearchFilterToggle = (
      await import("@components/word-search/WordSearchFilterToggle.vue")
    ).default;
    const wrapper = mount(WordSearchFilterToggle);
    expect(wrapper.find(".c-word-search-filter-toggle__counter").exists()).toBe(false);
  });

  it("shows counter badge with count when activeFilterCount > 0", async () => {
    activeFilterCountRef.value = 3;
    const WordSearchFilterToggle = (
      await import("@components/word-search/WordSearchFilterToggle.vue")
    ).default;
    const wrapper = mount(WordSearchFilterToggle);
    const counter = wrapper.find(".c-word-search-filter-toggle__counter");
    expect(counter.exists()).toBe(true);
    expect(counter.text()).toBe("3");
  });

  it("clicking calls $toggleWordListFilterFlyout", async () => {
    const WordSearchFilterToggle = (
      await import("@components/word-search/WordSearchFilterToggle.vue")
    ).default;
    const wrapper = mount(WordSearchFilterToggle);
    await wrapper.find("button").trigger("click");
    expect(mockToggle).toHaveBeenCalledOnce();
  });
});
