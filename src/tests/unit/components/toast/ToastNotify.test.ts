import ToastNotify from "@components/toast/ToastNotify.vue";
import { removeToastById } from "@stores/toastNotify.ts";
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

vi.mock("@stores/toastNotify.ts", () => ({
  removeToastById: vi.fn(),
}));

beforeAll(() => {
  window.HTMLElement.prototype.showPopover = vi.fn();
});

describe("ToastNotify.vue", () => {
  let wrapper: any;

  beforeEach(() => {
    wrapper = mount(ToastNotify, {
      props: {
        message: "Test message",
        id: 161,
        status: "info",
      },
    });
  });

  it("renders correctly", () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find(".c-toast-notify__message").text()).toBe("Test message");
  });

  it("calls showPopover on mount", () => {
    expect(window.HTMLElement.prototype.showPopover).toHaveBeenCalled();
  });

  it("calls removeToastById when hide is triggered", async () => {
    await wrapper.vm.hideToast();
    expect(removeToastById).toHaveBeenCalledWith(161);
  });
});
