import ScrollToTop from "@components/ScrollToTop.vue";
import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";

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

    // useIntersectionObserver only constructs the observer once its ref targets
    // resolve to actual elements (queried in onMounted) — provide them in the DOM.
    document.body.innerHTML = '<div id="docStart"></div><div class="c-footer__ground"></div>';
  });

  // Mount + flush twice: onMounted resolves the target refs, then VueUse's
  // post-flush watcher constructs the IntersectionObserver.
  const mountAndGetObserverCallback = async () => {
    const wrapper = mount(ScrollToTop);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    const callback = intersectionObserverMock.mock.calls[0][0];
    return { wrapper, callback };
  };

  it("should not show the button initially", () => {
    const wrapper = mount(ScrollToTop);
    expect(wrapper.find("button").isVisible()).toBe(false);
  });

  it("should show the button when scrolled", async () => {
    const { wrapper, callback } = await mountAndGetObserverCallback();

    // Simulate the intersection observer callback
    callback([{ isIntersecting: false }]);
    await wrapper.vm.$nextTick();

    expect(wrapper.find("button").isVisible()).toBe(true);
  });

  it("tooltip is not disabled when tooltip prop is non-empty (covers line 7 ternary true branch)", async () => {
    const wrapper = mount(ScrollToTop, { props: { tooltip: "Nach oben scrollen" } });
    await wrapper.vm.$nextTick();
    // With a non-empty tooltip, the ternary returns false → disabled = false || false = false
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("tooltip stays disabled when tooltip is non-empty but hideTooltip is true (covers line 7 || true branch)", async () => {
    const wrapper = mount(ScrollToTop, { props: { tooltip: "Nach oben", hideTooltip: true } });
    await wrapper.vm.$nextTick();
    // tooltip.length truthy → false, then false || true = true (disabled)
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("should scroll to top when button is clicked", async () => {
    const { wrapper, callback } = await mountAndGetObserverCallback();

    // Simulate the intersection observer callback
    callback([{ isIntersecting: false }]);
    await wrapper.vm.$nextTick();

    window.scrollTo = vi.fn();

    await wrapper.find("button").trigger("click");
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });
});
