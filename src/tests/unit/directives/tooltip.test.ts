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

describe("vTooltip directive", () => {
  it("creates a [popover='manual'] element in document.body on mount", () => {
    mountWithDirective("Test tooltip");
    expect(document.body.querySelector("[popover='manual']")).not.toBeNull();
  });

  it("panel has role='tooltip'", () => {
    mountWithDirective("Test");
    expect(document.body.querySelector("[popover]")?.getAttribute("role")).toBe("tooltip");
  });

  it("sets panel textContent from string value", () => {
    mountWithDirective("Hello Tooltip");
    expect(document.body.querySelector("[popover]")?.textContent).toBe("Hello Tooltip");
  });

  it("sets panel textContent from content option", () => {
    mountWithDirective({ content: "Option text" });
    expect(document.body.querySelector("[popover]")?.textContent).toBe("Option text");
  });

  it("sets anchor-name on host element", () => {
    const wrapper = mountWithDirective("Test");
    const anchorName = wrapper.find("button").element.style.getPropertyValue("anchor-name");
    expect(anchorName).toMatch(/^--tooltip-/);
  });

  it("sets position-anchor on panel matching host anchor-name", () => {
    const wrapper = mountWithDirective("Test");
    const anchorName = wrapper.find("button").element.style.getPropertyValue("anchor-name");
    const panel = document.body.querySelector("[popover]") as HTMLElement;
    expect(panel.style.getPropertyValue("position-anchor")).toBe(anchorName);
  });

  it("sets aria-describedby on host matching panel id", () => {
    const wrapper = mountWithDirective("Test");
    const panel = document.body.querySelector("[popover]") as HTMLElement;
    expect(wrapper.find("button").attributes("aria-describedby")).toBe(panel.id);
  });

  it("applies default placement class 'top'", () => {
    mountWithDirective("Test");
    expect(document.body.querySelector("[popover]")?.className).toContain("c-tooltip__panel--top");
  });

  it("applies specified placement class", () => {
    mountWithDirective({ content: "Test", placement: "bottom" });
    expect(document.body.querySelector("[popover]")?.className).toContain(
      "c-tooltip__panel--bottom",
    );
  });

  it("sets --c-tooltip-offset from offset option", () => {
    mountWithDirective({ content: "Test", offset: 16 });
    const panel = document.body.querySelector("[popover]") as HTMLElement;
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

  it("removes panel from document.body on unmount", () => {
    const wrapper = mountWithDirective("Test");
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
    const panel = document.body.querySelector("[popover]") as HTMLElement;
    await wrapper.find("button").trigger("pointerleave");
    panel.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("panel pointerleave triggers hide after delay", async () => {
    vi.useFakeTimers();
    mountWithDirective("Test");
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
