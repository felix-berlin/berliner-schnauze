import TooltipPopover from "@components/TooltipPopover.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockShowPopover = vi.fn();
const mockHidePopover = vi.fn();

let wrapper: ReturnType<typeof mount> | null = null;

// After Teleport, .c-tooltip__panel lives in document.body, not inside the wrapper.
const getPanel = () => document.body.querySelector<HTMLElement>(".c-tooltip__panel");

function mountComponent(...args: Parameters<typeof mount<typeof TooltipPopover>>) {
  const [component, options = {}] = args;
  wrapper = mount(component, { attachTo: document.body, ...options });
  return wrapper;
}

beforeEach(() => {
  HTMLElement.prototype.showPopover = mockShowPopover;
  HTMLElement.prototype.hidePopover = mockHidePopover;
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("TooltipPopover.vue", () => {
  it("renders default slot content inside .c-tooltip", () => {
    const w = mountComponent(TooltipPopover, { slots: { default: "<span>Hover me</span>" } });
    expect(w.find(".c-tooltip span").text()).toBe("Hover me");
  });

  it("renders content prop inside .c-tooltip__panel", () => {
    mountComponent(TooltipPopover, { props: { content: "Tooltip text" } });
    expect(getPanel()?.textContent?.trim()).toBe("Tooltip text");
  });

  it("renders #tooltip slot content overriding content prop", () => {
    mountComponent(TooltipPopover, {
      props: { content: "fallback" },
      slots: { tooltip: "<strong>Rich content</strong>" },
    });
    expect(getPanel()?.querySelector("strong")?.textContent).toBe("Rich content");
  });

  it("panel has popover='manual'", () => {
    mountComponent(TooltipPopover);
    expect(getPanel()?.getAttribute("popover")).toBe("manual");
  });

  it("panel has role='tooltip'", () => {
    mountComponent(TooltipPopover);
    expect(getPanel()?.getAttribute("role")).toBe("tooltip");
  });

  it("aria-describedby on wrapper matches panel id", () => {
    const w = mountComponent(TooltipPopover);
    const panelId = getPanel()?.getAttribute("id");
    expect(w.find(".c-tooltip").attributes("aria-describedby")).toBe(panelId);
  });

  it("anchor-name on wrapper matches position-anchor on panel", () => {
    const w = mountComponent(TooltipPopover);
    const wrapperStyle = w.find(".c-tooltip").attributes("style") ?? "";
    const panelStyle = getPanel()?.getAttribute("style") ?? "";
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
      // Mount + unmount each iteration to avoid stale panels in body
      const w = mount(TooltipPopover, { attachTo: document.body, props: { placement } });
      expect(document.body.querySelector(`.c-tooltip__panel--${placement}`)).not.toBeNull();
      w.unmount();
    }
    // Prevent afterEach from double-unmounting
    wrapper = null;
  });

  it("defaults to placement 'top' when not specified", () => {
    mountComponent(TooltipPopover);
    expect(document.body.querySelector(".c-tooltip__panel--top")).not.toBeNull();
  });

  it("sets --c-tooltip-offset CSS variable from offset prop", () => {
    mountComponent(TooltipPopover, { props: { offset: 16 } });
    expect(getPanel()?.getAttribute("style")).toContain("--c-tooltip-offset: 16px");
  });

  it("calls showPopover on pointerenter", async () => {
    const w = mountComponent(TooltipPopover);
    await w.find(".c-tooltip").trigger("pointerenter");
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("calls hidePopover on pointerleave after delay", async () => {
    vi.useFakeTimers();
    const w = mountComponent(TooltipPopover);
    await w.find(".c-tooltip").trigger("pointerleave");
    expect(mockHidePopover).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("calls showPopover on focusin", async () => {
    const w = mountComponent(TooltipPopover);
    await w.find(".c-tooltip").trigger("focusin");
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("calls hidePopover on focusout after delay", async () => {
    vi.useFakeTimers();
    const w = mountComponent(TooltipPopover);
    await w.find(".c-tooltip").trigger("focusout");
    expect(mockHidePopover).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("show() calls showPopover on panel element", () => {
    mountComponent(TooltipPopover);
    (wrapper!.vm as any).show();
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("hide() calls hidePopover on panel element immediately", () => {
    mountComponent(TooltipPopover);
    (wrapper!.vm as any).hide();
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("Escape key hides tooltip when visible (covers line 101 true branch)", () => {
    mountComponent(TooltipPopover);
    (wrapper!.vm as any).show();
    mockHidePopover.mockClear();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(mockHidePopover).toHaveBeenCalled();
  });

  it("Escape key does nothing when tooltip is not visible (covers line 101 && false branch)", () => {
    mountComponent(TooltipPopover);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("non-Escape keydown does not hide tooltip (covers line 101 key !== Escape branch)", () => {
    mountComponent(TooltipPopover);
    (wrapper!.vm as any).show();
    mockHidePopover.mockClear();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("moving pointer to panel cancels scheduled hide (covers cancelHide true branch)", async () => {
    vi.useFakeTimers();
    const w = mountComponent(TooltipPopover);
    await w.find(".c-tooltip").trigger("pointerleave");
    getPanel()!.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    vi.advanceTimersByTime(300);
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("show() fires requestAnimationFrame callback to sync arrow when refs are set (covers lines 90-92 true branch)", () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    mountComponent(TooltipPopover);
    (wrapper!.vm as any).show();
    rafCallbacks.forEach((cb) => cb(0));
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("rAF callback is a no-op when refs become null after unmount (covers line 92 false branch)", () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    mountComponent(TooltipPopover);
    (wrapper!.vm as any).show();
    wrapper!.unmount();
    wrapper = null;
    expect(() => rafCallbacks.forEach((cb) => cb(0))).not.toThrow();
  });

  it("show() does not call requestAnimationFrame when refs are null (covers line 90 false branch)", () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    mountComponent(TooltipPopover);
    const exposedShow = (wrapper!.vm as any).show as () => void;
    wrapper!.unmount();
    wrapper = null;
    const countBefore = rafCallbacks.length;
    expect(() => exposedShow()).not.toThrow();
    expect(rafCallbacks.length).toBe(countBefore);
  });
});
