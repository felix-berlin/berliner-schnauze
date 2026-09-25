import TooltipPopover from "@components/TooltipPopover.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockShowPopover = vi.fn();
const mockHidePopover = vi.fn();

type TooltipPopoverExposed = { show: () => Promise<void>; hide: () => void };

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
  (w.vm as unknown as TooltipPopoverExposed).show();

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
      "top",
      "top-start",
      "top-end",
      "bottom",
      "bottom-start",
      "bottom-end",
      "left",
      "right",
    ] as const;
    for (const placement of placements) {
      // Mount + show + unmount each iteration to avoid stale panels in body
      const w = mount(TooltipPopover, { attachTo: document.body, props: { placement } });
      await (w.vm as unknown as TooltipPopoverExposed).show();
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
    (wrapper!.vm as unknown as TooltipPopoverExposed).hide();
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

  it("show() after unmount does not throw when the rAF callback runs with null refs", async () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    mountComponent(TooltipPopover);
    const exposedShow = (wrapper!.vm as unknown as TooltipPopoverExposed).show;
    wrapper!.unmount();
    wrapper = null;
    await expect(exposedShow()).resolves.toBeUndefined();
    expect(() => rafCallbacks.forEach((cb) => cb(0))).not.toThrow();
  });
});

describe("TooltipPopover.vue DOM removal", () => {
  it("removes the panel from the DOM after the exit animation", async () => {
    vi.useFakeTimers();
    mountComponent(TooltipPopover, { props: { content: "Tip" } });
    await showTooltip();
    expect(getPanel()).not.toBeNull();
    (wrapper!.vm as unknown as TooltipPopoverExposed).hide();
    await vi.advanceTimersByTimeAsync(100);
    expect(getPanel()).toBeNull();
  });

  it("show() while already rendered reuses the panel", async () => {
    mountComponent(TooltipPopover, { props: { content: "Tip" } });
    await showTooltip();
    const panel = getPanel();
    await showTooltip();
    expect(getPanel()).toBe(panel);
    expect(mockShowPopover).toHaveBeenCalledTimes(2);
  });
});
