import TooltipPopover from "@components/TooltipPopover.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockShowPopover = vi.fn();
const mockHidePopover = vi.fn();

let wrapper: ReturnType<typeof mount> | null = null;

// Panel renders lazily (v-if="isRendered") — only exists in DOM after show() is called.
// Component is attached to document.body so querySelector still finds it.
const getPanel = () => document.body.querySelector<HTMLElement>(".c-tooltip__panel");

function mountComponent(...args: Parameters<typeof mount<typeof TooltipPopover>>) {
  const [component, options = {}] = args;
  wrapper = mount(component, { attachTo: document.body, ...options });
  return wrapper;
}

// Renders the tooltip panel into the DOM by calling show() and awaiting Vue's update.
const showTooltip = (w: ReturnType<typeof mount> = wrapper!) =>
  (w.vm as any).show() as Promise<void>;

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

  it("renders content prop inside .c-tooltip__panel", async () => {
    mountComponent(TooltipPopover, { props: { content: "Tooltip text" } });
    await showTooltip();
    expect(getPanel()?.textContent?.trim()).toBe("Tooltip text");
  });

  it("renders #tooltip slot content overriding content prop", async () => {
    mountComponent(TooltipPopover, {
      props: { content: "fallback" },
      slots: { tooltip: "<strong>Rich content</strong>" },
    });
    await showTooltip();
    expect(getPanel()?.querySelector("strong")?.textContent).toBe("Rich content");
  });

  it("panel has popover='manual'", async () => {
    mountComponent(TooltipPopover);
    await showTooltip();
    expect(getPanel()?.getAttribute("popover")).toBe("manual");
  });

  it("panel has role='tooltip'", async () => {
    mountComponent(TooltipPopover);
    await showTooltip();
    expect(getPanel()?.getAttribute("role")).toBe("tooltip");
  });

  it("aria-describedby on wrapper matches panel id", async () => {
    const w = mountComponent(TooltipPopover);
    await showTooltip();
    const panelId = getPanel()?.getAttribute("id");
    expect(w.find(".c-tooltip").attributes("aria-describedby")).toBe(panelId);
  });

  it("anchor-name on wrapper matches position-anchor on panel", async () => {
    const w = mountComponent(TooltipPopover);
    await showTooltip();
    const wrapperStyle = w.find(".c-tooltip").attributes("style") ?? "";
    const panelStyle = getPanel()?.getAttribute("style") ?? "";
    const anchorName = wrapperStyle.match(/anchor-name:\s*([^;]+)/)?.[1]?.trim();
    expect(anchorName).toBeTruthy();
    expect(panelStyle).toContain(`position-anchor: ${anchorName}`);
  });

  it("applies correct placement modifier class for each value", async () => {
    const placements = [
      "top", "top-start", "top-end",
      "bottom", "bottom-start", "bottom-end",
      "left", "right",
    ] as const;
    for (const placement of placements) {
      // Mount + show + unmount each iteration to avoid stale panels in body
      const w = mount(TooltipPopover, { attachTo: document.body, props: { placement } });
      await (w.vm as any).show();
      expect(document.body.querySelector(`.c-tooltip__panel--${placement}`)).not.toBeNull();
      w.unmount();
    }
    // Prevent afterEach from double-unmounting
    wrapper = null;
  });

  it("defaults to placement 'top' when not specified", async () => {
    mountComponent(TooltipPopover);
    await showTooltip();
    expect(document.body.querySelector(".c-tooltip__panel--top")).not.toBeNull();
  });

  it("sets --c-tooltip-offset CSS variable from offset prop", async () => {
    mountComponent(TooltipPopover, { props: { offset: 16 } });
    await showTooltip();
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
    await showTooltip(); // ensure panel is rendered so hide() can call panel.value?.hidePopover()
    mockShowPopover.mockClear();
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
    await showTooltip(); // ensure panel is rendered so hide() can call panel.value?.hidePopover()
    mockShowPopover.mockClear();
    await w.find(".c-tooltip").trigger("focusout");
    expect(mockHidePopover).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("show() calls showPopover on panel element", async () => {
    mountComponent(TooltipPopover);
    await showTooltip();
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("hide() calls hidePopover on panel element immediately", async () => {
    mountComponent(TooltipPopover);
    await showTooltip();
    mockShowPopover.mockClear();
    (wrapper!.vm as any).hide();
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("Escape key hides tooltip when visible (covers line 101 true branch)", async () => {
    mountComponent(TooltipPopover);
    await showTooltip();
    mockShowPopover.mockClear();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(mockHidePopover).toHaveBeenCalled();
  });

  it("Escape key does nothing when tooltip is not visible (covers line 101 && false branch)", () => {
    mountComponent(TooltipPopover);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("non-Escape keydown does not hide tooltip (covers line 101 key !== Escape branch)", async () => {
    mountComponent(TooltipPopover);
    await showTooltip();
    mockShowPopover.mockClear();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("moving pointer to panel cancels scheduled hide (covers cancelHide true branch)", async () => {
    vi.useFakeTimers();
    const w = mountComponent(TooltipPopover);
    await showTooltip(); // panel must be in DOM for pointerenter listener to work
    await w.find(".c-tooltip").trigger("pointerleave");
    getPanel()!.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    vi.advanceTimersByTime(300);
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("show() fires requestAnimationFrame callback to sync arrow when refs are set (covers lines 90-92 true branch)", async () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    mountComponent(TooltipPopover);
    await showTooltip();
    rafCallbacks.forEach((cb) => cb(0));
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("rAF callback is a no-op when refs become null after unmount (covers line 92 false branch)", async () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    mountComponent(TooltipPopover);
    await showTooltip();
    wrapper!.unmount();
    wrapper = null;
    expect(() => rafCallbacks.forEach((cb) => cb(0))).not.toThrow();
  });

  it("show() does not call requestAnimationFrame when refs are null (covers line 90 false branch)", async () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    mountComponent(TooltipPopover);
    const exposedShow = (wrapper!.vm as any).show as () => Promise<void>;
    wrapper!.unmount();
    wrapper = null;
    const countBefore = rafCallbacks.length;
    await expect(exposedShow()).resolves.toBeUndefined();
    expect(rafCallbacks.length).toBe(countBefore);
  });
});
