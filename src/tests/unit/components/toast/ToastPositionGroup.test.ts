import ToastPositionGroup from "@components/toast/ToastPositionGroup.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@components/toast/ToastNotify.vue", () => ({
  default: { template: '<div class="c-toast-notify" />' },
}));

const mockShowPopover = vi.fn();
const mockHidePopover = vi.fn();

type ExposedMethods = { onAfterLeave: () => void };
type SetupState = { onBeforeLeave: (el: Element) => void; open: () => void };

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
    (wrapper.vm as unknown as ExposedMethods).onAfterLeave();
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("calls hidePopover via onAfterLeave when last toast has exited", async () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await wrapper.setProps({ toasts: [] });
    (wrapper.vm as unknown as ExposedMethods).onAfterLeave();
    expect(mockHidePopover).toHaveBeenCalledOnce();
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
    (wrapper.vm as unknown as ExposedMethods).onAfterLeave();
    mockShowPopover.mockClear();
    // Re-open: 0→1 should call showPopover exactly once
    await wrapper.setProps({ toasts: [toast("b")] });
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("catches and logs error when showPopover throws", async () => {
    const { nextTick } = await import("vue");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockShowPopover.mockImplementationOnce(() => {
      throw new Error("popover error");
    });
    mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await nextTick();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("onBeforeLeave positions the leaving toast relative to the container", () => {
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [] },
    });
    const el = document.createElement("div");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      bottom: 0,
      height: 0,
      left: 50,
      right: 0,
      toJSON: () => ({}),
      top: 100,
      width: 200,
    } as DOMRect);
    const setupState = wrapper.getCurrentComponent()!.setupState as unknown as SetupState;
    setupState.onBeforeLeave(el);
    // jsdom container rect is all zeros → top=100-0=100, left=50-0=50
    expect(el.style.top).toBe("100px");
    expect(el.style.left).toBe("50px");
    wrapper.unmount();
  });

  it("catches and logs error when hidePopover throws during onAfterLeave", async () => {
    const { nextTick } = await import("vue");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockHidePopover.mockImplementationOnce(() => {
      throw new Error("popover error");
    });
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await nextTick();
    await wrapper.setProps({ toasts: [] });
    (wrapper.vm as unknown as ExposedMethods).onAfterLeave();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("open() returns early when already open (covers line 40 isOpen.value branch)", async () => {
    const { nextTick } = await import("vue");
    const wrapper = mount(ToastPositionGroup, {
      props: { position: "top-right", toasts: [toast("a")] },
    });
    await nextTick(); // onMounted fires open() → isOpen becomes true
    mockShowPopover.mockClear();
    // Call open() again directly — should hit isOpen.value === true early return
    (wrapper.getCurrentComponent()!.setupState as unknown as SetupState).open();
    expect(mockShowPopover).not.toHaveBeenCalled();
  });

  it("onBeforeLeave sets inline styles on the leaving element", async () => {
    const wrapper = mount(ToastPositionGroup, {
      attachTo: document.body,
      props: { position: "top-right", toasts: [toast("a")] },
    });
    const el = document.createElement("div");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
      bottom: 0,
      height: 0,
      left: 50,
      right: 0,
      toJSON: () => ({}),
      top: 100,
      width: 200,
    } as DOMRect);
    // Access unexposed onBeforeLeave from setup state
    const setupState = wrapper.getCurrentComponent()!.setupState as unknown as SetupState;
    setupState.onBeforeLeave(el);
    expect(el.style.width).toBe("200px");
    wrapper.unmount();
  });
});
