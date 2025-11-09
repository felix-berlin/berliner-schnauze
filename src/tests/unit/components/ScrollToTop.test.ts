import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";
import ScrollToTop from "@components/ScrollToTop.vue";

describe("ScrollToTop.vue", () => {
  let intersectionObserverMock: any;
  let observeMock: any;
  let disconnectMock: any;

  beforeEach(() => {
    observeMock = vi.fn();
    disconnectMock = vi.fn();

    intersectionObserverMock = vi.fn(function (callback: any) {
      // Store the callback so we can call it later
      this.callback = callback;
      return {
        observe: observeMock,
        disconnect: disconnectMock,
        takeRecords: vi.fn(),
        unobserve: vi.fn(),
      };
    });

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
