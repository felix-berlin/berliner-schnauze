import TooltipPopover from "@components/TooltipPopover.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockShowPopover = vi.fn();
const mockHidePopover = vi.fn();

beforeEach(() => {
  HTMLElement.prototype.showPopover = mockShowPopover;
  HTMLElement.prototype.hidePopover = mockHidePopover;
});
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("TooltipPopover.vue", () => {
  it("renders default slot content inside .c-tooltip", () => {
    const wrapper = mount(TooltipPopover, { slots: { default: "<span>Hover me</span>" } });
    expect(wrapper.find(".c-tooltip span").text()).toBe("Hover me");
  });

  it("renders content prop inside .c-tooltip__panel", () => {
    const wrapper = mount(TooltipPopover, { props: { content: "Tooltip text" } });
    expect(wrapper.find(".c-tooltip__panel").text()).toBe("Tooltip text");
  });

  it("renders #tooltip slot content overriding content prop", () => {
    const wrapper = mount(TooltipPopover, {
      props: { content: "fallback" },
      slots: { tooltip: "<strong>Rich content</strong>" },
    });
    expect(wrapper.find(".c-tooltip__panel strong").text()).toBe("Rich content");
  });

  it("panel has popover='manual'", () => {
    const wrapper = mount(TooltipPopover);
    expect(wrapper.find(".c-tooltip__panel").attributes("popover")).toBe("manual");
  });

  it("panel has role='tooltip'", () => {
    const wrapper = mount(TooltipPopover);
    expect(wrapper.find(".c-tooltip__panel").attributes("role")).toBe("tooltip");
  });

  it("aria-describedby on wrapper matches panel id", () => {
    const wrapper = mount(TooltipPopover);
    const panelId = wrapper.find(".c-tooltip__panel").attributes("id");
    expect(wrapper.find(".c-tooltip").attributes("aria-describedby")).toBe(panelId);
  });

  it("anchor-name on wrapper matches position-anchor on panel", () => {
    const wrapper = mount(TooltipPopover);
    const wrapperStyle = wrapper.find(".c-tooltip").attributes("style") ?? "";
    const panelStyle = wrapper.find(".c-tooltip__panel").attributes("style") ?? "";
    const anchorName = wrapperStyle.match(/anchor-name:\s*([^;]+)/)?.[1]?.trim();
    expect(anchorName).toBeTruthy();
    expect(panelStyle).toContain(`position-anchor: ${anchorName}`);
  });

  it("applies correct placement modifier class for each value", () => {
    const placements = [
      "top", "top-start", "top-end",
      "bottom", "bottom-start", "bottom-end",
      "left", "right",
    ] as const;
    for (const placement of placements) {
      const wrapper = mount(TooltipPopover, { props: { placement } });
      expect(wrapper.find(`.c-tooltip__panel--${placement}`).exists()).toBe(true);
    }
  });

  it("defaults to placement 'top' when not specified", () => {
    const wrapper = mount(TooltipPopover);
    expect(wrapper.find(".c-tooltip__panel--top").exists()).toBe(true);
  });

  it("sets --c-tooltip-offset CSS variable from offset prop", () => {
    const wrapper = mount(TooltipPopover, { props: { offset: 16 } });
    expect(wrapper.find(".c-tooltip__panel").attributes("style")).toContain(
      "--c-tooltip-offset: 16px",
    );
  });

  it("calls showPopover on pointerenter", async () => {
    const wrapper = mount(TooltipPopover);
    await wrapper.find(".c-tooltip").trigger("pointerenter");
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("calls hidePopover on pointerleave after delay", async () => {
    vi.useFakeTimers();
    const wrapper = mount(TooltipPopover);
    await wrapper.find(".c-tooltip").trigger("pointerleave");
    expect(mockHidePopover).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("calls showPopover on focusin", async () => {
    const wrapper = mount(TooltipPopover);
    await wrapper.find(".c-tooltip").trigger("focusin");
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("calls hidePopover on focusout after delay", async () => {
    vi.useFakeTimers();
    const wrapper = mount(TooltipPopover);
    await wrapper.find(".c-tooltip").trigger("focusout");
    expect(mockHidePopover).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("show() calls showPopover on panel element", () => {
    const wrapper = mount(TooltipPopover);
    (wrapper.vm as any).show();
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("hide() calls hidePopover on panel element immediately", () => {
    const wrapper = mount(TooltipPopover);
    (wrapper.vm as any).hide();
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("Escape key hides tooltip when visible (covers line 101 true branch)", () => {
    const wrapper = mount(TooltipPopover);
    (wrapper.vm as any).show();
    mockHidePopover.mockClear();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(mockHidePopover).toHaveBeenCalled();
  });

  it("Escape key does nothing when tooltip is not visible (covers line 101 && false branch)", () => {
    mount(TooltipPopover);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("non-Escape keydown does not hide tooltip (covers line 101 key !== Escape branch)", () => {
    const wrapper = mount(TooltipPopover);
    (wrapper.vm as any).show();
    mockHidePopover.mockClear();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("moving pointer to panel cancels scheduled hide (covers cancelHide true branch)", async () => {
    vi.useFakeTimers();
    const wrapper = mount(TooltipPopover);
    await wrapper.find(".c-tooltip").trigger("pointerleave");
    await wrapper.find(".c-tooltip__panel").trigger("pointerenter");
    vi.advanceTimersByTime(300);
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("show() fires requestAnimationFrame callback to sync arrow when refs are set (covers lines 90-92 true branch)", () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    const wrapper = mount(TooltipPopover, { attachTo: document.body });
    (wrapper.vm as any).show();
    rafCallbacks.forEach((cb) => cb(0));
    expect(mockShowPopover).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("rAF callback is a no-op when refs become null after unmount (covers line 92 false branch)", () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    const wrapper = mount(TooltipPopover, { attachTo: document.body });
    (wrapper.vm as any).show();
    wrapper.unmount(); // refs → null
    expect(() => rafCallbacks.forEach((cb) => cb(0))).not.toThrow();
  });

  it("show() does not call requestAnimationFrame when refs are null (covers line 90 false branch)", () => {
    // After unmount, Vue sets all template refs to null — show() is still
    // callable via the closure captured by defineExpose and must not throw.
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    const wrapper = mount(TooltipPopover, { attachTo: document.body });
    const exposedShow = (wrapper.vm as any).show as () => void;
    wrapper.unmount(); // template refs become null
    const countBefore = rafCallbacks.length;
    expect(() => exposedShow()).not.toThrow();
    // requestAnimationFrame must NOT have been scheduled (refs are null → if is false)
    expect(rafCallbacks.length).toBe(countBefore);
  });
});
