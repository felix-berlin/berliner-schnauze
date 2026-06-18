import ToastPositionGroup from "@components/toast/ToastPositionGroup.vue";
import { supportsPopover } from "@stores/toastNotify.ts";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@stores/toastNotify.ts", () => ({
  supportsPopover: vi.fn(() => true),
}));
vi.mock("@components/toast/ToastNotify.vue", () => ({
  default: { template: '<div class="c-toast-notify" />' },
}));

const mockShowPopover = vi.fn();
const mockHidePopover = vi.fn();

const toast = (id: string) => ({
  id,
  message: `Toast ${id}`,
  position: "top-right" as const,
  status: "info" as const,
});

describe("ToastPositionGroup.vue", () => {
  beforeEach(() => {
    HTMLElement.prototype.showPopover = mockShowPopover;
    HTMLElement.prototype.hidePopover = mockHidePopover;
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders container with correct position modifier class", () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "bottom-left", toasts: [] },
    });
    expect(wrapper.find(".c-toast-container--bottom-left").exists()).toBe(true);
  });

  it("renders one ToastNotify per toast", () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a"), toast("b")] },
    });
    expect(wrapper.findAll(".c-toast-notify")).toHaveLength(2);
  });

  it("calls showPopover on mount when toasts are already present", async () => {
    mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await import("vue").then((v) => v.nextTick());
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("calls showPopover when toasts go from 0 to 1", async () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [] },
    });
    await wrapper.setProps({ toasts: [toast("a")] });
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("does not call hidePopover via onAfterLeave when toasts still remain", async () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a"), toast("b")] },
    });
    await wrapper.setProps({ toasts: [toast("b")] });
    await (wrapper.vm as any).onAfterLeave();
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("calls hidePopover via onAfterLeave when last toast has exited", async () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await wrapper.setProps({ toasts: [] });
    await (wrapper.vm as any).onAfterLeave();
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("renders nothing when popover is not supported", () => {
    vi.mocked(supportsPopover).mockReturnValueOnce(false);
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [] },
    });
    expect(wrapper.find(".c-toast-container").exists()).toBe(false);
  });
});
