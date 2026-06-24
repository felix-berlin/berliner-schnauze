import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useBreakpoints: vi.fn(() => ({ greater: vi.fn(() => ref(false)) })),
    usePreferredReducedMotion: vi.fn(() => ref("reduce")),
  };
});

vi.mock("virtual:icons/lucide/mouse-pointer-click", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, default: { template: "<span />" } };
});

describe("WordSearchLink.vue", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("renders a button with class c-word-search-link", async () => {
    const WordSearchLink = (await import("@components/WordSearchLink.vue")).default;
    const wrapper = mount(WordSearchLink);
    expect(wrapper.find("button.c-word-search-link").exists()).toBe(true);
  });

  it("contains the correct label text", async () => {
    const WordSearchLink = (await import("@components/WordSearchLink.vue")).default;
    const wrapper = mount(WordSearchLink);
    expect(wrapper.text()).toContain("Berliner Mundart durchsuchen");
  });

  it("calls trackEvent on click", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const WordSearchLink = (await import("@components/WordSearchLink.vue")).default;
    const wrapper = mount(WordSearchLink);
    await wrapper.find("button").trigger("click");
    expect(trackEvent).toHaveBeenCalledWith("Search", "Click Search Link", "Search Link Clicked");
  });
});
