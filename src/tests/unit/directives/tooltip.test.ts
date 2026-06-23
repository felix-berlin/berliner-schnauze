import { vTooltip } from "@/directives/tooltip";
import type { TooltipValue } from "@/directives/tooltip";
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
  document.querySelectorAll("[popover]").forEach((el) => el.remove());
});

const mountWithDirective = (value: TooltipValue) =>
  mount(
    { template: '<button v-tooltip="val">trigger</button>', props: ["val"] },
    { global: { directives: { tooltip: vTooltip } }, props: { val: value } },
  );

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
});
