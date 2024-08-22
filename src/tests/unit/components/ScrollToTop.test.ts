import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";
import ScrollToTop from "/home/felix/workspace/berliner-schnauze/src/components/ScrollToTop.vue";

describe("ScrollToTop.vue", () => {
  let intersectionObserverMock: any;

  beforeEach(() => {
    intersectionObserverMock = vi.fn((callback: any) => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(),
      unobserve: vi.fn(),
    }));

    vi.stubGlobal("IntersectionObserver", intersectionObserverMock);
  });

  it("should not show the button initially", () => {
    const wrapper = mount(ScrollToTop);
    expect(wrapper.find("button").isVisible()).toBe(false);
  });

  it("should show the button when scrolled", async () => {
    const wrapper = mount(ScrollToTop);
    const callback = intersectionObserverMock.mock.calls[0][0];

    // Simulate the intersection observer callback
    callback([{ isIntersecting: false }]);
    await wrapper.vm.$nextTick();

    expect(wrapper.find("button").isVisible()).toBe(true);
  });

  it("should scroll to top when button is clicked", async () => {
    const wrapper = mount(ScrollToTop);
    const callback = intersectionObserverMock.mock.calls[0][0];

    // Simulate the intersection observer callback
    callback([{ isIntersecting: false }]);
    await wrapper.vm.$nextTick();

    window.scrollTo = vi.fn();

    await wrapper.find("button").trigger("click");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
