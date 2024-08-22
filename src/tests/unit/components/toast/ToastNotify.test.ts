import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import ToastNotify from "@components/toast/ToastNotify.vue";
import { removeToastById, supportsPopover } from "@stores/index.ts";

vi.mock("@stores/index.ts", () => ({
  supportsPopover: vi.fn(() => true),
  removeToastById: vi.fn(),
}));

// Mock the showPopover method globally
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

    // Mock the toast.value object with a showPopover method
    wrapper.vm.toast = {
      showPopover: vi.fn(),
    };
  });

  it("renders correctly", () => {
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find(".c-toast-notify__message").text()).toBe("Test message");
  });

  it("calls showPopover if supported", () => {
    wrapper.vm.showToast();
    expect(wrapper.vm.toast.showPopover).toHaveBeenCalled();
  });

  it("shows and hides the toast correctly", async () => {
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isOpen).toBe(true);

    await wrapper.vm.hideToast();
    expect(removeToastById).toHaveBeenCalledWith(161);
  });
});
