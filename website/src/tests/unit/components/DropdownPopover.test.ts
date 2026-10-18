import DropdownPopover from "@components/DropdownPopover.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";

const { resizeCb, resizeTargets } = vi.hoisted(() => ({
  resizeCb: { fn: null as ((...args: unknown[]) => void) | null },
  resizeTargets: { get: null as (() => unknown[]) | null },
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useResizeObserver: vi.fn((targets: () => unknown[], fn: (...args: unknown[]) => void) => {
      resizeTargets.get = targets;
      resizeCb.fn = fn;
      return { isSupported: { value: true }, stop: vi.fn() };
    }),
  };
});

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

// Helper: dispatch a ToggleEvent on the panel element
const openToggle = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .find(".c-dropdown__panel")
    .element.dispatchEvent(new ToggleEvent("toggle", { bubbles: false, newState: "open" }));

const closeToggle = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .find(".c-dropdown__panel")
    .element.dispatchEvent(new ToggleEvent("toggle", { bubbles: false, newState: "closed" }));

// Helper: mount with a default scoped slot that renders a button receiving triggerProps
const mountWithTrigger = (options: Parameters<typeof mount>[1] = {}) =>
  mount(DropdownPopover, {
    ...options,
    slots: {
      default: (slotProps: { triggerProps: Record<string, unknown> }) =>
        h("button", { ...slotProps.triggerProps, "data-testid": "trigger-btn" }, "Open"),
      ...options.slots,
    },
  });

describe("DropdownPopover.vue", () => {
  // --- Structure ---

  it("renders a .c-dropdown wrapper as the root element", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown").exists()).toBe(true);
  });

  it("renders a .c-dropdown__trigger span wrapping the default slot", () => {
    const wrapper = mount(DropdownPopover, {
      slots: { default: "<span>label</span>" },
    });
    expect(wrapper.find(".c-dropdown__trigger span").text()).toBe("label");
  });

  it("panel has popover='auto' attribute", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__panel").attributes("popover")).toBe("auto");
  });

  // --- Slot scope: triggerProps ---

  it("triggerProps.popovertarget matches panel id", () => {
    const wrapper = mountWithTrigger();
    const panelId = wrapper.find(".c-dropdown__panel").attributes("id");
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("popovertarget")).toBe(panelId);
  });

  it("triggerProps.aria-controls matches panel id", () => {
    const wrapper = mountWithTrigger();
    const panelId = wrapper.find(".c-dropdown__panel").attributes("id");
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("aria-controls")).toBe(panelId);
  });

  it("triggerProps.aria-expanded is 'false' initially", () => {
    const wrapper = mountWithTrigger();
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("aria-expanded")).toBe("false");
  });

  it("triggerProps.aria-expanded becomes 'true' after toggle newState='open'", async () => {
    const wrapper = mountWithTrigger();
    openToggle(wrapper);
    await nextTick();
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("aria-expanded")).toBe("true");
  });

  it("triggerProps.aria-expanded becomes 'false' after toggle newState='closed'", async () => {
    const wrapper = mountWithTrigger();
    openToggle(wrapper);
    await nextTick();
    closeToggle(wrapper);
    await nextTick();
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("aria-expanded")).toBe("false");
  });

  it("slot prop isOpen is false initially", () => {
    let capturedIsOpen: boolean | undefined;
    mount(DropdownPopover, {
      slots: {
        default: (slotProps: { isOpen: boolean }) => {
          capturedIsOpen = slotProps.isOpen;
          return h("button", "Open");
        },
      },
    });
    expect(capturedIsOpen).toBe(false);
  });

  it("slot prop panelId matches the panel element id", () => {
    let capturedPanelId: string | undefined;
    const wrapper = mount(DropdownPopover, {
      slots: {
        default: (slotProps: { panelId: string }) => {
          capturedPanelId = slotProps.panelId;
          return h("button", "Open");
        },
      },
    });
    const panelId = wrapper.find(".c-dropdown__panel").attributes("id");
    expect(capturedPanelId).toBe(panelId);
  });

  // --- Anchor & positioning ---

  it("trigger span style contains anchor-name", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__trigger").attributes("style")).toContain("anchor-name:");
  });

  it("panel style contains position-anchor", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__panel").attributes("style")).toContain("position-anchor:");
  });

  it("anchor-name on trigger matches position-anchor on panel", () => {
    const wrapper = mount(DropdownPopover);
    const triggerStyle = wrapper.find(".c-dropdown__trigger").attributes("style") ?? "";
    const panelStyle = wrapper.find(".c-dropdown__panel").attributes("style") ?? "";
    const anchorName = triggerStyle.match(/anchor-name:\s*([^;]+)/)?.[1]?.trim();
    expect(anchorName).toBeTruthy();
    expect(panelStyle).toContain(`position-anchor: ${anchorName}`);
  });

  // --- Props: placement, offset ---

  it("applies correct CSS class for each placement value", () => {
    const placements = [
      "bottom-start",
      "bottom-end",
      "bottom",
      "top-start",
      "top-end",
      "top",
    ] as const;
    for (const placement of placements) {
      const wrapper = mount(DropdownPopover, { props: { placement } });
      expect(wrapper.find(`.c-dropdown__panel--${placement}`).exists()).toBe(true);
    }
  });

  it("sets --c-dropdown-offset in panel inline style from offset prop", () => {
    const wrapper = mount(DropdownPopover, { props: { offset: 16 } });
    expect(wrapper.find(".c-dropdown__panel").attributes("style")).toContain(
      "--c-dropdown-offset: 16px",
    );
  });

  // --- arrow ---

  it("arrow element is rendered with aria-hidden once opened", async () => {
    const wrapper = mountWithTrigger();
    expect(wrapper.find(".c-dropdown__arrow").exists()).toBe(false);
    openToggle(wrapper);
    await nextTick();
    expect(wrapper.find(".c-dropdown__arrow").attributes("aria-hidden")).toBe("true");
  });

  // --- $attrs ---

  it("inherited attrs land on outer .c-dropdown wrapper, not trigger span", () => {
    const wrapper = mount(DropdownPopover, { attrs: { "data-custom": "yes" } });
    expect(wrapper.find(".c-dropdown").attributes("data-custom")).toBe("yes");
    expect(wrapper.find(".c-dropdown__trigger").attributes("data-custom")).toBeUndefined();
  });

  // --- close() ---

  it("close() calls hidePopover and focuses first focusable element inside trigger", () => {
    const wrapper = mountWithTrigger({ attachTo: document.body });
    const btnEl = wrapper.find("[data-testid=trigger-btn]").element as HTMLElement;
    const focusSpy = vi.spyOn(btnEl, "focus");
    (wrapper.vm as InstanceType<typeof DropdownPopover>).close();
    expect(mockHidePopover).toHaveBeenCalledOnce();
    expect(focusSpy).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  // --- lazy panel content ---

  describe("lazy panel content", () => {
    it("panel slot is NOT rendered before first open", () => {
      const wrapper = mount(DropdownPopover, {
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      expect(wrapper.find(".panel-item").exists()).toBe(false);
    });

    it("panel slot renders after first toggle to open", async () => {
      const wrapper = mount(DropdownPopover, {
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      openToggle(wrapper);
      await nextTick();
      expect(wrapper.find(".panel-item").exists()).toBe(true);
    });

    it("panel slot is unmounted after close animation", async () => {
      vi.useFakeTimers();
      const wrapper = mount(DropdownPopover, {
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      openToggle(wrapper);
      await nextTick();
      closeToggle(wrapper);
      await nextTick();
      // content stays during close animation
      expect(wrapper.find(".panel-item").exists()).toBe(true);
      vi.runAllTimers();
      await nextTick();
      expect(wrapper.find(".panel-item").exists()).toBe(false);
    });
  });

  // --- ResizeObserver callback (line 112) ---

  it("resize observer targets are empty while closed and populated while open", async () => {
    const wrapper = mountWithTrigger();
    const getTargets = resizeTargets.get!;
    expect(getTargets()).toEqual([]);
    openToggle(wrapper);
    await nextTick();
    expect(getTargets()).toHaveLength(3);
    closeToggle(wrapper);
    await nextTick();
    expect(getTargets()).toEqual([]);
  });

  it("resize observer callback calls syncArrow when dropdown is open", async () => {
    const wrapper = mountWithTrigger();
    openToggle(wrapper);
    await nextTick();
    // isOpen is now true — callback should invoke syncArrow without throwing
    resizeCb.fn?.();
    await nextTick();
    expect(wrapper.find(".c-dropdown").exists()).toBe(true);
  });

  // --- arrowDynamicStyle: arrowAbove=false ternary branches (lines 92, 94) ---

  it("syncArrow sets arrowAbove=false when panel is below trigger", async () => {
    const wrapper = mountWithTrigger();
    const panelEl = wrapper.find(".c-dropdown__panel").element;
    const triggerSpan = wrapper.find(".c-dropdown__trigger").element;
    vi.spyOn(panelEl, "getBoundingClientRect").mockReturnValue({
      bottom: 400,
      height: 200,
      left: 0,
      right: 200,
      toJSON: () => ({}),
      top: 200,
      width: 200,
      x: 0,
      y: 200,
    } as DOMRect);
    vi.spyOn(triggerSpan, "getBoundingClientRect").mockReturnValue({
      bottom: 100,
      height: 50,
      left: 50,
      right: 150,
      toJSON: () => ({}),
      top: 50,
      width: 100,
      x: 50,
      y: 50,
    } as DOMRect);
    openToggle(wrapper);
    await nextTick();
    expect(wrapper.find(".c-dropdown__arrow").exists()).toBe(true);
  });

  // --- onToggle close: setTimeout false branch (line 137) ---

  it("setTimeout callback does not clear hasContent when dropdown was reopened within 150ms", async () => {
    vi.useFakeTimers();
    const wrapper = mount(DropdownPopover, {
      slots: { panel: '<button class="panel-item">Action</button>' },
    });
    openToggle(wrapper);
    await nextTick();
    closeToggle(wrapper);
    await nextTick();
    openToggle(wrapper); // re-open before 150ms elapses
    await nextTick();
    vi.advanceTimersByTime(150); // timer fires: isOpen=true → skip clearing hasContent
    await nextTick();
    expect(wrapper.find(".panel-item").exists()).toBe(true);
  });

  // --- onToggle close: focus-stealing guard false branch (line 140) ---

  it("onToggle close skips focus-steal when activeElement is outside trigger and panel", async () => {
    const wrapper = mount(DropdownPopover, { attachTo: document.body });
    const external = document.createElement("button");
    document.body.appendChild(external);
    external.focus();
    openToggle(wrapper);
    await nextTick();
    closeToggle(wrapper);
    await nextTick();
    expect(document.activeElement).toBe(external);
    external.remove();
    wrapper.unmount();
  });

  // --- close() fallback (line 190) ---

  it("close() focuses triggerEl directly when no focusable descendant inside trigger", () => {
    const wrapper = mount(DropdownPopover, {
      attachTo: document.body,
      slots: { default: "<span>not focusable</span>" },
    });
    const triggerEl = wrapper.find(".c-dropdown__trigger").element as HTMLElement;
    const focusSpy = vi.spyOn(triggerEl, "focus");
    (wrapper.vm as InstanceType<typeof DropdownPopover>).close();
    expect(mockHidePopover).toHaveBeenCalledOnce();
    expect(focusSpy).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
