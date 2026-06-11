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

  it("calls hidePopover + markClosing immediately, then removeToast after 400ms", async () => {
    await wrapper.find(".c-toast-notify__close").trigger("click");

    expect(window.HTMLElement.prototype.hidePopover).toHaveBeenCalled();
    expect(markClosing).toHaveBeenCalledWith(161); // synchronous — no timer

    await vi.advanceTimersByTimeAsync(400);
    expect(removeToast).toHaveBeenCalledWith(161);
  });
});
