import WordSearchLink from "@components/WordSearchLink.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";

const mockState = vi.hoisted(() => ({
  preferredMotion: "reduce" as string,
}));

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    usePreferredReducedMotion: vi.fn(() => ({
      get value() {
        return mockState.preferredMotion;
      },
    })),
  };
});

describe("WordSearchLink.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.preferredMotion = "reduce";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a link to /suche with class c-word-search-link", () => {
    const wrapper = mount(WordSearchLink);
    const link = wrapper.find("a.c-word-search-link");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("/suche");
  });

  it("contains the correct label text", () => {
    const wrapper = mount(WordSearchLink);
    expect(wrapper.text()).toContain("Berliner Mundart durchsuchen");
  });

  it("calls trackEvent on click", async () => {
    vi.useFakeTimers();
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(WordSearchLink);
    await wrapper.find("a").trigger("click");
    expect(trackEvent).toHaveBeenCalledWith("Search", "Click Search Link", "Search Link Clicked");
    vi.useRealTimers();
  });

  it("adds u-ripple class on mount when preferredMotion is no-preference", async () => {
    mockState.preferredMotion = "no-preference";
    const wrapper = mount(WordSearchLink);
    await nextTick();
    expect(wrapper.find(".c-word-search-link__icon-wrap").classes()).toContain("u-ripple");
  });

  it("removes u-ripple class after 2000ms", async () => {
    vi.useFakeTimers();
    mockState.preferredMotion = "no-preference";
    const wrapper = mount(WordSearchLink);
    await nextTick();
    expect(wrapper.find(".c-word-search-link__icon-wrap").classes()).toContain("u-ripple");

    vi.advanceTimersByTime(2100);
    await nextTick();
    expect(wrapper.find(".c-word-search-link__icon-wrap").classes()).not.toContain("u-ripple");
    vi.useRealTimers();
  });

  it("does not add u-ripple class when preferredMotion is reduce", async () => {
    mockState.preferredMotion = "reduce";
    const wrapper = mount(WordSearchLink);
    await nextTick();
    expect(wrapper.find(".c-word-search-link__icon-wrap").classes()).not.toContain("u-ripple");
  });
});
