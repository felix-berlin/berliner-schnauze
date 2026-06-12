import ToastNotify from "@components/toast/ToastNotify.vue";
import { markClosing, removeToast } from "@stores/toastNotify.ts";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";

vi.mock("@stores/toastNotify.ts", () => ({
  markClosing: vi.fn(),
  removeToast: vi.fn(),
}));

beforeAll(() => {
  window.HTMLElement.prototype.showPopover = vi.fn();
  window.HTMLElement.prototype.hidePopover = vi.fn();
});

describe("ToastNotify.vue", () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    wrapper = mount(ToastNotify, {
      props: {
        message: "Test message",
        id: 161,
        status: "info",
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    wrapper.unmount();
  });

  it("renders correctly", () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find(".c-toast-notify__message").text()).toBe("Test message");
  });

  it("calls showPopover on mount", () => {
    expect(window.HTMLElement.prototype.showPopover).toHaveBeenCalled();
  });

  it("starts exit animation on close, calls hidePopover + markClosing after 300ms, removeToast after 400ms more", async () => {
    await wrapper.find(".c-toast-notify__close").trigger("click");

    // Exit animation starts immediately (class applied), but hidePopover/markClosing
    // are deferred until the 300ms CSS animation completes so the toast stays
    // :popover-open (and keeps its anchor position) while it's still visible.
    expect(wrapper.find(".c-toast-notify").classes()).toContain("is-exiting");
    expect(window.HTMLElement.prototype.hidePopover).not.toHaveBeenCalled();
    expect(markClosing).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    expect(window.HTMLElement.prototype.hidePopover).toHaveBeenCalled();
    expect(markClosing).toHaveBeenCalledWith(161);

    await vi.advanceTimersByTimeAsync(400);
    expect(removeToast).toHaveBeenCalledWith(161);
  });

  it("starts hidden (is-entering) and reveals after the double rAF", async () => {
    expect(wrapper.find(".c-toast-notify").classes()).toContain("is-entering");

    // Sinon fake timers fire rAF callbacks at 16ms intervals — two frames = 32ms
    await vi.advanceTimersByTimeAsync(32);
    expect(wrapper.find(".c-toast-notify").classes()).not.toContain("is-entering");
  });

  it("auto-dismisses through exit animation → hidePopover/markClosing → removeToast", async () => {
    await vi.advanceTimersByTimeAsync(32); // entry rAFs → auto-hide armed

    // Exit starts at default timeout (5000) − animation (300) − remove delay (400)
    await vi.advanceTimersByTimeAsync(4299);
    expect(wrapper.find(".c-toast-notify").classes()).not.toContain("is-exiting");

    await vi.advanceTimersByTimeAsync(1);
    expect(wrapper.find(".c-toast-notify").classes()).toContain("is-exiting");
    expect(window.HTMLElement.prototype.hidePopover).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    expect(window.HTMLElement.prototype.hidePopover).toHaveBeenCalled();
    expect(markClosing).toHaveBeenCalledWith(161);

    await vi.advanceTimersByTimeAsync(400);
    expect(removeToast).toHaveBeenCalledWith(161);
  });

  it("staggers auto-dismiss by stack position (180ms per step)", async () => {
    const stacked = mount(ToastNotify, {
      props: { message: "stacked", id: 162, status: "info", stackIndex: 2 },
    });

    await vi.advanceTimersByTimeAsync(32); // entry rAFs for both toasts

    // Base exit point (4300ms): the stackIndex-0 toast from beforeEach exits …
    await vi.advanceTimersByTimeAsync(4300);
    expect(wrapper.find(".c-toast-notify").classes()).toContain("is-exiting");
    // … the stacked one (stackIndex 2 → +360ms) does not yet
    expect(stacked.find(".c-toast-notify").classes()).not.toContain("is-exiting");

    await vi.advanceTimersByTimeAsync(360);
    expect(stacked.find(".c-toast-notify").classes()).toContain("is-exiting");

    stacked.unmount();
  });

  it("never staggers manual close — exit starts immediately", async () => {
    const stacked = mount(ToastNotify, {
      props: { message: "stacked", id: 163, status: "info", stackIndex: 5 },
    });
    await vi.advanceTimersByTimeAsync(32);

    await stacked.find(".c-toast-notify__close").trigger("click");
    expect(stacked.find(".c-toast-notify").classes()).toContain("is-exiting");

    stacked.unmount();
  });
});
