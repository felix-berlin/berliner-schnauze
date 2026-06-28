import { syncTooltipArrow, vTooltip } from "@/directives/tooltip";
import type { TooltipValue } from "@/directives/tooltip";
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockShowPopover = vi.fn();
const mockHidePopover = vi.fn();

const mountedWrappers: VueWrapper[] = [];

beforeEach(() => {
  HTMLElement.prototype.showPopover = mockShowPopover;
  HTMLElement.prototype.hidePopover = mockHidePopover;
});
afterEach(() => {
  mountedWrappers.forEach((w) => { try { w.unmount(); } catch {} });
  mountedWrappers.length = 0;
  vi.clearAllMocks();
  vi.useRealTimers();
  document.querySelectorAll("[popover]").forEach((el) => el.remove());
});

const mountWithDirective = (value: TooltipValue) => {
  const wrapper = mount(
    { template: '<button v-tooltip="val">trigger</button>', props: ["val"] },
    { global: { directives: { tooltip: vTooltip } }, props: { val: value } },
  );
  mountedWrappers.push(wrapper);
  return wrapper;
};

// Access the panel element directly from directive state (useful before first show).
const getStatePanel = (wrapper: VueWrapper) =>
  (wrapper.find("button").element as any)._tooltip?.panel as HTMLElement | undefined;

// Trigger show and return the panel now in document.body.
const showAndGetPanel = async (wrapper: VueWrapper) => {
  await wrapper.find("button").trigger("pointerenter");
  return document.body.querySelector("[popover]") as HTMLElement;
};

describe("vTooltip directive", () => {
  it("creates a [popover='manual'] element in document.body on show", async () => {
    const wrapper = mountWithDirective("Test tooltip");
    expect(document.body.querySelector("[popover='manual']")).toBeNull();
    await showAndGetPanel(wrapper);
    expect(document.body.querySelector("[popover='manual']")).not.toBeNull();
  });

  it("panel has role='tooltip'", async () => {
    const wrapper = mountWithDirective("Test");
    const panel = await showAndGetPanel(wrapper);
    expect(panel.getAttribute("role")).toBe("tooltip");
  });

  it("sets panel textContent from string value", async () => {
    const wrapper = mountWithDirective("Hello Tooltip");
    const panel = await showAndGetPanel(wrapper);
    expect(panel.textContent).toBe("Hello Tooltip");
  });

  it("sets panel textContent from content option", async () => {
    const wrapper = mountWithDirective({ content: "Option text" });
    const panel = await showAndGetPanel(wrapper);
    expect(panel.textContent).toBe("Option text");
  });

  it("sets anchor-name on host element", () => {
    const wrapper = mountWithDirective("Test");
    const anchorName = wrapper.find("button").element.style.getPropertyValue("anchor-name");
    expect(anchorName).toMatch(/^--tooltip-/);
  });

  it("sets position-anchor on panel matching host anchor-name", async () => {
    const wrapper = mountWithDirective("Test");
    const anchorName = wrapper.find("button").element.style.getPropertyValue("anchor-name");
    const panel = await showAndGetPanel(wrapper);
    expect(panel.style.getPropertyValue("position-anchor")).toBe(anchorName);
  });

  it("sets aria-describedby on host matching panel id", async () => {
    const wrapper = mountWithDirective("Test");
    const panel = await showAndGetPanel(wrapper);
    expect(wrapper.find("button").attributes("aria-describedby")).toBe(panel.id);
  });

  it("applies default placement class 'top'", async () => {
    const wrapper = mountWithDirective("Test");
    const panel = await showAndGetPanel(wrapper);
    expect(panel.className).toContain("c-tooltip__panel--top");
  });

  it("applies specified placement class", async () => {
    const wrapper = mountWithDirective({ content: "Test", placement: "bottom" });
    const panel = await showAndGetPanel(wrapper);
    expect(panel.className).toContain("c-tooltip__panel--bottom");
  });

  it("sets --c-tooltip-offset from offset option", async () => {
    const wrapper = mountWithDirective({ content: "Test", offset: 16 });
    const panel = await showAndGetPanel(wrapper);
    expect(panel.style.getPropertyValue("--c-tooltip-offset")).toBe("16px");
  });

  it("calls showPopover on pointerenter", async () => {
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerenter");
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("calls hidePopover on pointerleave after delay", async () => {
    vi.useFakeTimers();
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerleave");
    expect(mockHidePopover).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("calls showPopover on focusin", async () => {
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("focusin");
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("calls hidePopover on focusout after delay", async () => {
    vi.useFakeTimers();
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("focusout");
    expect(mockHidePopover).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("does not call showPopover on pointerenter when disabled: true", async () => {
    const wrapper = mountWithDirective({ content: "Test", disabled: true });
    await wrapper.find("button").trigger("pointerenter");
    expect(mockShowPopover).not.toHaveBeenCalled();
  });

  it("calls showPopover immediately when shown: true on mount", () => {
    mountWithDirective({ content: "Test", shown: true });
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("calls showPopover when shown changes from false to true", async () => {
    const wrapper = mountWithDirective({ content: "Test", shown: false });
    await wrapper.setProps({ val: { content: "Test", shown: true } });
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("calls hidePopover when shown changes from true to false", async () => {
    const wrapper = mountWithDirective({ content: "Test", shown: true });
    vi.clearAllMocks();
    await wrapper.setProps({ val: { content: "Test", shown: false } });
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("does not call showPopover on hover while shown: true override is active", async () => {
    const wrapper = mountWithDirective({ content: "Test", shown: true });
    vi.clearAllMocks();
    await wrapper.find("button").trigger("pointerenter");
    expect(mockShowPopover).not.toHaveBeenCalled();
  });

  it("removes panel from document.body on unmount", async () => {
    const wrapper = mountWithDirective("Test");
    await showAndGetPanel(wrapper);
    expect(document.body.querySelector("[popover]")).not.toBeNull();
    wrapper.unmount();
    expect(document.body.querySelector("[popover]")).toBeNull();
  });

  it("removes anchor-name from host on unmount", () => {
    const wrapper = mountWithDirective("Test");
    const btn = wrapper.find("button").element;
    wrapper.unmount();
    expect(btn.style.getPropertyValue("anchor-name")).toBe("");
  });

  it("unmounted clears active hideTimer", async () => {
    vi.useFakeTimers();
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerleave");
    wrapper.unmount();
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("Escape keydown hides tooltip after pointerenter", async () => {
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerenter");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("non-Escape keydown does not hide tooltip", async () => {
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerenter");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("Escape clears active hideTimer and hides immediately", async () => {
    vi.useFakeTimers();
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerenter");
    await wrapper.find("button").trigger("pointerleave");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("panel pointerenter cancels pending hide timer", async () => {
    vi.useFakeTimers();
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerenter"); // adds panel to body
    const panel = document.body.querySelector("[popover]") as HTMLElement;
    await wrapper.find("button").trigger("pointerleave");
    panel.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("panel pointerleave triggers hide after delay", async () => {
    vi.useFakeTimers();
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerenter"); // adds panel to body
    const panel = document.body.querySelector("[popover]") as HTMLElement;
    panel.dispatchEvent(new Event("pointerleave"));
    expect(mockHidePopover).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("onHide does nothing when shown override is active", async () => {
    vi.useFakeTimers();
    const wrapper = mountWithDirective({ content: "Test", shown: true });
    vi.clearAllMocks();
    await wrapper.find("button").trigger("pointerleave");
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("onShow clears pending hideTimer before showing", async () => {
    vi.useFakeTimers();
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerleave");
    await wrapper.find("button").trigger("pointerenter");
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).not.toHaveBeenCalled();
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("updated: changing disabled false→true hides panel and blocks hover", async () => {
    const wrapper = mountWithDirective({ content: "Test", disabled: false });
    await wrapper.setProps({ val: { content: "Test", disabled: true } });
    expect(mockHidePopover).toHaveBeenCalledOnce();
    vi.clearAllMocks();
    await wrapper.find("button").trigger("pointerenter");
    expect(mockShowPopover).not.toHaveBeenCalled();
  });

  it("updated: changing disabled true→false re-enables hover", async () => {
    const wrapper = mountWithDirective({ content: "Test", disabled: true });
    await wrapper.setProps({ val: { content: "Test", disabled: false } });
    await wrapper.find("button").trigger("pointerenter");
    expect(mockShowPopover).toHaveBeenCalledOnce();
  });

  it("updated: disabling while hideTimer is pending clears timer and hides once", async () => {
    vi.useFakeTimers();
    const wrapper = mountWithDirective({ content: "Test", disabled: false });
    await wrapper.find("button").trigger("pointerleave");
    expect(mockHidePopover).not.toHaveBeenCalled();
    await wrapper.setProps({ val: { content: "Test", disabled: true } });
    expect(mockHidePopover).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(300);
    expect(mockHidePopover).toHaveBeenCalledOnce();
  });

  it("onHide clears existing timer when called again while timer is pending (covers lines 163-165)", async () => {
    vi.useFakeTimers();
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerleave"); // first: sets hideTimer
    await wrapper.find("button").trigger("pointerleave"); // second: hideTimer !== null → clears, resets
    vi.advanceTimersByTime(300);
    expect(mockHidePopover).toHaveBeenCalledOnce(); // only one hide despite two pointerleave calls
  });

  it("update: shown true→false with pending timer clears timer (covers lines 264-266)", async () => {
    vi.useFakeTimers();
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerleave"); // sets hideTimer
    // shown changes from undefined to true: showPopover called, timer still pending
    await wrapper.setProps({ val: { content: "Test", shown: true } });
    expect(mockShowPopover).toHaveBeenCalledOnce();
    // shown changes from true to false with hideTimer pending: hits lines 264-266
    await wrapper.setProps({ val: { content: "Test", shown: false } });
    expect(mockHidePopover).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(300);
    expect(mockHidePopover).toHaveBeenCalledOnce(); // timer was cleared, not double-fired
  });

  it("unmounted is safe when _tooltip is absent (covers line 220 !state early return)", () => {
    const el = document.createElement("button");
    expect(() => vTooltip.unmounted!(el, null as any, null as any, null as any)).not.toThrow();
  });

  it("updated is safe when _tooltip is absent (covers lines 234-237 !state early return)", () => {
    const el = document.createElement("button");
    expect(() =>
      vTooltip.updated!(
        el,
        { value: "test", oldValue: undefined } as any,
        null as any,
        null as any,
      ),
    ).not.toThrow();
  });

  it("normalize uses '' for content when value object has no content (covers line 96 ?? '' branch)", () => {
    const wrapper = mountWithDirective({ disabled: true } as any);
    // Panel is never shown when disabled — access directly via directive state
    const panel = getStatePanel(wrapper);
    expect(panel?.textContent).toBe("");
  });

  it("panel pointerenter is safe when no hide timer is pending (covers line 185 null branch)", async () => {
    const wrapper = mountWithDirective("Test");
    await wrapper.find("button").trigger("pointerenter"); // adds panel to body
    mockShowPopover.mockClear();
    const panel = document.body.querySelector("[popover]") as HTMLElement;
    // Dispatch pointerenter on the panel without any prior pointerleave (hideTimer is null)
    panel.dispatchEvent(new Event("pointerenter"));
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("updated uses binding.value as fallback when oldValue is undefined (covers line 237 ?? binding.value)", () => {
    const wrapper = mountWithDirective("Initial");
    const btn = wrapper.find("button").element;
    vTooltip.updated!(btn, { value: "Updated", oldValue: undefined } as any, null as any, null as any);
    // Panel may not be in body yet — access via directive state
    const panel = getStatePanel(wrapper);
    expect(panel?.textContent).toBe("Updated");
  });
});

function makeEl(rect: Partial<DOMRect>): HTMLElement {
  const el = document.createElement("div");
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect);
  return el;
}

describe("syncTooltipArrow", () => {
  it("positions arrow at bottom when panel is above trigger", () => {
    const panel = makeEl({ top: 0, bottom: 50, left: 100, right: 300, width: 200, height: 50 });
    const el = makeEl({ top: 60, bottom: 80, left: 140, right: 260 });
    const arrow = document.createElement("span");
    syncTooltipArrow(el, panel, arrow);
    expect(arrow.style.bottom).toBe("-4px");
    expect(arrow.style.top).toBe("");
  });

  it("positions arrow at top when panel is below trigger", () => {
    const panel = makeEl({ top: 80, bottom: 130, left: 100, right: 300, width: 200, height: 50 });
    const el = makeEl({ top: 0, bottom: 50, left: 140, right: 260 });
    const arrow = document.createElement("span");
    syncTooltipArrow(el, panel, arrow);
    expect(arrow.style.top).toBe("-4px");
    expect(arrow.style.bottom).toBe("");
  });

  it("positions arrow on right side when panel is left of trigger", () => {
    const panel = makeEl({ top: 20, bottom: 80, left: 0, right: 100, width: 100, height: 60 });
    const el = makeEl({ top: 20, bottom: 80, left: 110, right: 210 });
    const arrow = document.createElement("span");
    syncTooltipArrow(el, panel, arrow);
    expect(arrow.style.right).toBe("-4px");
    expect(arrow.style.left).toBe("");
  });

  it("positions arrow on left side when panel is right of trigger", () => {
    const panel = makeEl({ top: 20, bottom: 80, left: 110, right: 210, width: 100, height: 60 });
    const el = makeEl({ top: 20, bottom: 80, left: 0, right: 100 });
    const arrow = document.createElement("span");
    syncTooltipArrow(el, panel, arrow);
    expect(arrow.style.left).toBe("-4px");
    expect(arrow.style.right).toBe("");
  });
});
