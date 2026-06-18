import ToastNotify from "@components/toast/ToastNotify.vue";
import { removeToastById, supportsPopover } from "@stores/toastNotify.ts";
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

vi.mock("@stores/toastNotify.ts", () => ({
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

  it("does not render action button without actionLabel prop", () => {
    expect(wrapper.find(".c-toast-notify__action").exists()).toBe(false);
  });

  it("renders action button when actionLabel prop is provided", async () => {
    const w = mount(ToastNotify, {
      props: { message: "Test", id: 162, status: "info", actionLabel: "Jetzt aktualisieren" },
    });
    expect(w.find(".c-toast-notify__action").exists()).toBe(true);
    expect(w.find(".c-toast-notify__action").text()).toBe("Jetzt aktualisieren");
  });

  it("calls onAction callback and hides toast when action button is clicked", async () => {
    const onAction = vi.fn();
    const w = mount(ToastNotify, {
      props: { message: "Test", id: 163, status: "info", actionLabel: "Aktualisieren", onAction },
    });
    w.vm.toast = { showPopover: vi.fn() };
    await w.find(".c-toast-notify__action").trigger("click");
    expect(onAction).toHaveBeenCalledOnce();
    expect(removeToastById).toHaveBeenCalledWith(163);
  });

  it("hides toast via action button even when onAction is not provided", async () => {
    const w = mount(ToastNotify, {
      props: { message: "Test", id: 164, status: "info", actionLabel: "Aktualisieren" },
    });
    w.vm.toast = { showPopover: vi.fn() };
    await w.find(".c-toast-notify__action").trigger("click");
    expect(removeToastById).toHaveBeenCalledWith(164);
  });
});
