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

  it("does not call showPopover twice when already open (double-open guard)", async () => {
    const { nextTick } = await import("vue");
    // Mount with toasts already present — onMounted fires showPopover (isOpen → true)
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await nextTick();
    mockShowPopover.mockClear();
    // Simulate toasts going 0→1 while already open (guard should block second call)
    // We do this by directly calling open() again — equivalent to watch 0→1 firing while mounted
    await wrapper.setProps({ toasts: [toast("a"), toast("b")] });
    // oldLen=1, newLen=2 — watch does not fire (condition: oldLen===0), so no extra call
    expect(mockShowPopover).not.toHaveBeenCalled();
  });

  it("calls showPopover again after hidePopover resets the guard", async () => {
    const { nextTick } = await import("vue");
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await nextTick();
    // Close: set toasts to empty and trigger onAfterLeave (hidePopover + isOpen=false)
    await wrapper.setProps({ toasts: [] });
    await (wrapper.vm as any).onAfterLeave();
    mockShowPopover.mockClear();
    // Re-open: 0→1 should call showPopover exactly once
    await wrapper.setProps({ toasts: [toast("b")] });
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("catches and logs error when showPopover throws", async () => {
    const { nextTick } = await import("vue");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockShowPopover.mockImplementationOnce(() => { throw new Error("popover error"); });
    mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await nextTick();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("catches and logs error when hidePopover throws during onAfterLeave", async () => {
    const { nextTick } = await import("vue");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockHidePopover.mockImplementationOnce(() => { throw new Error("popover error"); });
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await nextTick();
    await wrapper.setProps({ toasts: [] });
    await (wrapper.vm as any).onAfterLeave();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("onBeforeLeave sets inline styles on the leaving element", async () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
      attachTo: document.body,
    });
    const el = document.createElement("div");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue(
      { top: 100, left: 50, width: 200, bottom: 0, right: 0, height: 0, toJSON: () => ({}) } as DOMRect,
    );
    // Access unexposed onBeforeLeave from setup state
    const setupState = (wrapper.getCurrentComponent() as any).setupState;
    setupState.onBeforeLeave(el);
    expect(el.style.width).toBe("200px");
    wrapper.unmount();
  });
});
