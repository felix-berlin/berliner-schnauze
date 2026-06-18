import ToastNotify from "@components/toast/ToastNotify.vue";
import { removeToastById } from "@stores/toastNotify.ts";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@stores/toastNotify.ts", () => ({
  removeToastById: vi.fn(),
}));
vi.mock("virtual:icons/lucide/x", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/info", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/check-circle-2", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/x-circle", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/alert-circle", () => ({ default: { template: "<svg />" } }));

afterEach(() => vi.clearAllMocks());

describe("ToastNotify.vue", () => {
  it("renders as a plain div — no popover attribute", () => {
    const wrapper = mount(ToastNotify, { props: { id: "abc-123", message: "Hi" } });
    expect(wrapper.find(".c-toast-notify").attributes("popover")).toBeUndefined();
  });

  it("displays the message", () => {
    const wrapper = mount(ToastNotify, { props: { id: "abc-123", message: "Test message" } });
    expect(wrapper.find(".c-toast-notify__message").text()).toBe("Test message");
  });

  it("calls removeToastById with string id when close button clicked", async () => {
    const wrapper = mount(ToastNotify, {
      props: { id: "test-uuid-1", message: "Hi", showClose: true },
    });
    await wrapper.find(".c-toast-notify__close").trigger("click");
    expect(removeToastById).toHaveBeenCalledWith("test-uuid-1");
  });

  it("calls onAction and removeToastById when action button clicked", async () => {
    const onAction = vi.fn();
    const wrapper = mount(ToastNotify, {
      props: { id: "test-uuid-2", message: "Hi", actionLabel: "Aktualisieren", onAction },
    });
    await wrapper.find(".c-toast-notify__action").trigger("click");
    expect(onAction).toHaveBeenCalledOnce();
    expect(removeToastById).toHaveBeenCalledWith("test-uuid-2");
  });

  it("calls removeToastById even when onAction is absent", async () => {
    const wrapper = mount(ToastNotify, {
      props: { id: "test-uuid-3", message: "Hi", actionLabel: "Aktualisieren" },
    });
    await wrapper.find(".c-toast-notify__action").trigger("click");
    expect(removeToastById).toHaveBeenCalledWith("test-uuid-3");
  });

  it("does not render action button without actionLabel", () => {
    const wrapper = mount(ToastNotify, { props: { id: "abc", message: "Hi" } });
    expect(wrapper.find(".c-toast-notify__action").exists()).toBe(false);
  });

  it("sets role=alert and aria-live=assertive for error status", () => {
    const wrapper = mount(ToastNotify, { props: { id: "e", message: "Err", status: "error" } });
    expect(wrapper.find(".c-toast-notify").attributes("role")).toBe("alert");
    expect(wrapper.find(".c-toast-notify").attributes("aria-live")).toBe("assertive");
  });

  it("sets role=status and aria-live=polite for non-error status", () => {
    const wrapper = mount(ToastNotify, { props: { id: "s", message: "Ok", status: "success" } });
    expect(wrapper.find(".c-toast-notify").attributes("role")).toBe("status");
    expect(wrapper.find(".c-toast-notify").attributes("aria-live")).toBe("polite");
  });
});
