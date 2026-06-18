import ToastNotify from "@components/toast/ToastNotify.vue";
import { removeToastById } from "@stores/toastNotify.ts";
import { mount, type VueWrapper } from "@vue/test-utils";
import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockIsSwiping = ref(false);

vi.mock("@vueuse/core", () => ({
  useSwipe: vi.fn(() => ({ isSwiping: mockIsSwiping })),
}));
vi.mock("@stores/toastNotify.ts", () => ({
  removeToastById: vi.fn(),
}));
vi.mock("virtual:icons/lucide/x", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/info", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/check-circle-2", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/x-circle", () => ({ default: { template: "<svg />" } }));
vi.mock("virtual:icons/lucide/alert-circle", () => ({ default: { template: "<svg />" } }));

// Track all wrappers so watchers on mockIsSwiping don't leak across tests
const mountedWrappers: VueWrapper[] = [];
const mountToast = (...args: Parameters<typeof mount>) => {
  const wrapper = mount(...args);
  mountedWrappers.push(wrapper);
  return wrapper;
};

afterEach(() => {
  mountedWrappers.forEach((w) => w.unmount());
  mountedWrappers.length = 0;
  mockIsSwiping.value = false;
  vi.clearAllMocks();
});

describe("ToastNotify.vue", () => {
  it("renders as a plain div — no popover attribute", () => {
    const wrapper = mountToast(ToastNotify, { props: { id: "abc-123", message: "Hi" } });
    expect(wrapper.find(".c-toast-notify").attributes("popover")).toBeUndefined();
  });

  it("displays the message", () => {
    const wrapper = mountToast(ToastNotify, { props: { id: "abc-123", message: "Test message" } });
    expect(wrapper.find(".c-toast-notify__message").text()).toBe("Test message");
  });

  it("calls removeToastById with string id when close button clicked", async () => {
    const wrapper = mountToast(ToastNotify, {
      props: { id: "test-uuid-1", message: "Hi", showClose: true },
    });
    await wrapper.find(".c-toast-notify__close").trigger("click");
    expect(removeToastById).toHaveBeenCalledWith("test-uuid-1");
  });

  it("calls onAction and removeToastById when action button clicked", async () => {
    const onAction = vi.fn();
    const wrapper = mountToast(ToastNotify, {
      props: { id: "test-uuid-2", message: "Hi", actionLabel: "Aktualisieren", onAction },
    });
    await wrapper.find(".c-toast-notify__action").trigger("click");
    expect(onAction).toHaveBeenCalledOnce();
    expect(removeToastById).toHaveBeenCalledWith("test-uuid-2");
  });

  it("calls removeToastById even when onAction is absent", async () => {
    const wrapper = mountToast(ToastNotify, {
      props: { id: "test-uuid-3", message: "Hi", actionLabel: "Aktualisieren" },
    });
    await wrapper.find(".c-toast-notify__action").trigger("click");
    expect(removeToastById).toHaveBeenCalledWith("test-uuid-3");
  });

  it("does not render action button without actionLabel", () => {
    const wrapper = mountToast(ToastNotify, { props: { id: "abc", message: "Hi" } });
    expect(wrapper.find(".c-toast-notify__action").exists()).toBe(false);
  });

  it("sets role=alert and aria-live=assertive for error status", () => {
    const wrapper = mountToast(ToastNotify, { props: { id: "e", message: "Err", status: "error" } });
    expect(wrapper.find(".c-toast-notify").attributes("role")).toBe("alert");
    expect(wrapper.find(".c-toast-notify").attributes("aria-live")).toBe("assertive");
  });

  it("sets role=status and aria-live=polite for non-error status", () => {
    const wrapper = mountToast(ToastNotify, { props: { id: "s", message: "Ok", status: "success" } });
    expect(wrapper.find(".c-toast-notify").attributes("role")).toBe("status");
    expect(wrapper.find(".c-toast-notify").attributes("aria-live")).toBe("polite");
  });

  it("swipe-to-dismiss calls removeToastById when isSwiping becomes true", async () => {
    const { nextTick } = await import("vue");
    mountToast(ToastNotify, {
      props: { id: "swipe-test", message: "hi", closeOnSwipe: true },
    });
    mockIsSwiping.value = true;
    await nextTick();
    expect(removeToastById).toHaveBeenCalledWith("swipe-test");
  });

  it("does not call removeToastById on swipe when closeOnSwipe is false", async () => {
    const { nextTick } = await import("vue");
    mountToast(ToastNotify, {
      props: { id: "swipe-off", message: "hi", closeOnSwipe: false },
    });
    mockIsSwiping.value = true;
    await nextTick();
    expect(removeToastById).not.toHaveBeenCalled();
  });
});
