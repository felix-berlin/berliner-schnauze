import WordSearchLink from "@components/WordSearchLink.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";

const mockState = vi.hoisted(() => ({
  preferredMotion: "reduce" as string,
  breakpointGreater: false as boolean,
}));

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useBreakpoints: vi.fn(() => ({ greater: vi.fn(() => ({ get value() { return mockState.breakpointGreater; } })) })),
    usePreferredReducedMotion: vi.fn(() => ({ get value() { return mockState.preferredMotion; } })),
  };
});

vi.mock("virtual:icons/lucide/mouse-pointer-click", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, default: { template: "<span />" } };
});

describe("WordSearchLink.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.preferredMotion = "reduce";
    mockState.breakpointGreater = false;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders a button with class c-word-search-link", () => {
    const wrapper = mount(WordSearchLink);
    expect(wrapper.find("button.c-word-search-link").exists()).toBe(true);
  });

  it("contains the correct label text", () => {
    const wrapper = mount(WordSearchLink);
    expect(wrapper.text()).toContain("Berliner Mundart durchsuchen");
  });

  it("calls trackEvent on click", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(WordSearchLink);
    await wrapper.find("button").trigger("click");
    expect(trackEvent).toHaveBeenCalledWith("Search", "Click Search Link", "Search Link Clicked");
  });

  it("scrolls to search input when element is found", async () => {
    const input = document.createElement("input");
    input.className = "c-word-search__search-input";
    input.scrollIntoView = vi.fn();
    document.body.appendChild(input);

    const wrapper = mount(WordSearchLink);
    await wrapper.find("button").trigger("click");

    expect(input.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("focuses the input when largerThanSm is true and element is found", async () => {
    mockState.breakpointGreater = true;
    const input = document.createElement("input");
    input.className = "c-word-search__search-input";
    input.scrollIntoView = vi.fn();
    input.focus = vi.fn();
    document.body.appendChild(input);

    const wrapper = mount(WordSearchLink);
    await wrapper.find("button").trigger("click");

    expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("does not focus input when largerThanSm is false", async () => {
    mockState.breakpointGreater = false;
    const input = document.createElement("input");
    input.className = "c-word-search__search-input";
    input.scrollIntoView = vi.fn();
    input.focus = vi.fn();
    document.body.appendChild(input);

    const wrapper = mount(WordSearchLink);
    await wrapper.find("button").trigger("click");

    expect(input.focus).not.toHaveBeenCalled();
  });

  it("retries finding search input if not found initially", async () => {
    vi.useFakeTimers();
    const input = document.createElement("input");
    input.className = "c-word-search__search-input";
    input.scrollIntoView = vi.fn();

    const wrapper = mount(WordSearchLink);
    await wrapper.find("button").trigger("click");
    // Element not in DOM yet — retry scheduled
    expect(input.scrollIntoView).not.toHaveBeenCalled();

    document.body.appendChild(input);
    vi.advanceTimersByTime(110);
    await nextTick();

    expect(input.scrollIntoView).toHaveBeenCalled();
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

  it("logs error when search bar not found after all retries (covers line 44)", async () => {
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mount(WordSearchLink);
    await wrapper.find("button").trigger("click");
    // 5 retries × 100ms each = 500ms total; advance past all of them
    vi.advanceTimersByTime(600);
    expect(consoleSpy).toHaveBeenCalledWith("Search bar element not found after multiple attempts.");
    consoleSpy.mockRestore();
    vi.useRealTimers();
  });
});
