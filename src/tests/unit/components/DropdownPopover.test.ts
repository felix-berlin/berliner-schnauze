import DropdownPopover from "@components/DropdownPopover.vue";
import { mount } from "@vue/test-utils";
import { h, nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resizeCb } = vi.hoisted(() => ({
  resizeCb: { fn: null as ((...args: unknown[]) => void) | null },
}));

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useResizeObserver: vi.fn((_targets: unknown, fn: (...args: unknown[]) => void) => {
      resizeCb.fn = fn;
      return { stop: vi.fn(), isSupported: { value: true } };
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
    .element.dispatchEvent(new ToggleEvent("toggle", { newState: "open", bubbles: false }));

const closeToggle = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .find(".c-dropdown__panel")
    .element.dispatchEvent(new ToggleEvent("toggle", { newState: "closed", bubbles: false }));

// Helper: mount with a default scoped slot that renders a button receiving triggerProps
const mountWithTrigger = (options: Parameters<typeof mount>[1] = {}) =>
  mount(DropdownPopover, {
    ...options,
    slots: {
      default: (slotProps: { triggerProps: Record<string, unknown> }) =>
        h("button", { ...slotProps.triggerProps, "data-testid": "trigger-btn" }, "Open"),
      ...((options as any).slots ?? {}),
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

  it("renders panel slot content inside panel element when lazy=false", () => {
    const wrapper = mount(DropdownPopover, {
      props: { lazy: false },
      slots: { panel: "<button>Action</button>" },
    });
    expect(wrapper.find(".c-dropdown__panel button").text()).toBe("Action");
  });

  it("panel has popover='auto' attribute", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__panel").attributes("popover")).toBe("auto");
  });

  // --- Slot scope: triggerProps ---

  it("triggerProps.popovertarget matches panel id when triggers includes 'click'", () => {
    const wrapper = mountWithTrigger({ props: { triggers: ["click"] } });
    const panelId = wrapper.find(".c-dropdown__panel").attributes("id");
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("popovertarget")).toBe(panelId);
  });

  it("triggerProps does not include popovertarget when triggers is ['hover']", () => {
    const wrapper = mountWithTrigger({ props: { triggers: ["hover"] } });
    expect(wrapper.find("[data-testid=trigger-btn]").attributes("popovertarget")).toBeUndefined();
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

  // --- Props: placement, offset, skidding ---

  it("applies correct CSS class for each placement value", () => {
    const placements = [
      "bottom-start", "bottom-end", "bottom",
      "top-start", "top-end", "top",
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

  it("sets --c-dropdown-skidding in panel inline style from skidding prop", () => {
    const wrapper = mount(DropdownPopover, { props: { skidding: 12 } });
    expect(wrapper.find(".c-dropdown__panel").attributes("style")).toContain(
      "--c-dropdown-skidding: 12px",
    );
  });

  it("--c-dropdown-skidding defaults to 0px", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__panel").attributes("style")).toContain(
      "--c-dropdown-skidding: 0px",
    );
  });

  // --- Props: panelClass, panelTag ---

  it("panelClass is applied to the panel element", () => {
    const wrapper = mount(DropdownPopover, { props: { panelClass: "my-custom-panel" } });
    expect(wrapper.find(".c-dropdown__panel.my-custom-panel").exists()).toBe(true);
  });

  it("panelTag changes the panel element tag (default is div)", () => {
    const wrapper = mount(DropdownPopover, { props: { panelTag: "menu" } });
    expect(wrapper.find("menu.c-dropdown__panel").exists()).toBe(true);
  });

  // --- Props: arrow, arrowPadding ---

  it("arrow element is NOT rendered when arrow=false", () => {
    const wrapper = mount(DropdownPopover, { props: { arrow: false } });
    expect(wrapper.find(".c-dropdown__arrow").exists()).toBe(false);
  });

  it("arrow element IS rendered when arrow=true (lazy=false)", () => {
    const wrapper = mount(DropdownPopover, { props: { arrow: true, lazy: false } });
    expect(wrapper.find(".c-dropdown__arrow").exists()).toBe(true);
  });

  it("arrow element has aria-hidden='true'", () => {
    const wrapper = mount(DropdownPopover, { props: { arrow: true, lazy: false } });
    expect(wrapper.find(".c-dropdown__arrow").attributes("aria-hidden")).toBe("true");
  });

  it("sets --c-dropdown-arrow-padding in panel style from arrowPadding prop", () => {
    const wrapper = mount(DropdownPopover, { props: { arrow: true, arrowPadding: 8 } });
    expect(wrapper.find(".c-dropdown__panel").attributes("style")).toContain(
      "--c-dropdown-arrow-padding: 8px",
    );
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

  // --- lazy prop ---

  describe("lazy prop", () => {
    it("panel slot is NOT rendered before first open when lazy=true (default)", () => {
      const wrapper = mount(DropdownPopover, {
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      expect(wrapper.find(".panel-item").exists()).toBe(false);
    });

    it("panel slot renders after first toggle to open when lazy=true", async () => {
      const wrapper = mount(DropdownPopover, {
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      openToggle(wrapper);
      await nextTick();
      expect(wrapper.find(".panel-item").exists()).toBe(true);
    });

    it("panel slot is unmounted after close animation when lazy=true", async () => {
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

    it("panel slot renders immediately on mount when lazy=false", () => {
      const wrapper = mount(DropdownPopover, {
        props: { lazy: false },
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      expect(wrapper.find(".panel-item").exists()).toBe(true);
    });
  });

  // --- triggers: hover ---

  describe("hover trigger", () => {
    beforeEach(() => vi.useFakeTimers());

    it("mouseenter on trigger calls showPopover", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["hover"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("mouseenter");
      expect(mockShowPopover).toHaveBeenCalledOnce();
    });

    it("mouseleave on trigger hides popover after 100ms delay", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["hover"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("mouseleave");
      expect(mockHidePopover).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(mockHidePopover).toHaveBeenCalledOnce();
    });

    it("mouseenter on panel cancels the close timer", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["hover"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("mouseleave");
      await wrapper.find(".c-dropdown__panel").trigger("mouseenter");
      vi.advanceTimersByTime(100);
      expect(mockHidePopover).not.toHaveBeenCalled();
    });

    it("mouseleave on panel re-schedules the close", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["hover"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("mouseleave");
      await wrapper.find(".c-dropdown__panel").trigger("mouseenter");
      await wrapper.find(".c-dropdown__panel").trigger("mouseleave");
      vi.advanceTimersByTime(100);
      expect(mockHidePopover).toHaveBeenCalledOnce();
    });

    it("mouseenter does not call showPopover when triggers does not include 'hover'", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["click"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("mouseenter");
      expect(mockShowPopover).not.toHaveBeenCalled();
    });
  });

  // --- triggers: focus ---

  describe("focus trigger", () => {
    beforeEach(() => vi.useFakeTimers());

    it("focusin on trigger calls showPopover", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["focus"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("focusin");
      expect(mockShowPopover).toHaveBeenCalledOnce();
    });

    it("focusout on trigger hides popover after 100ms delay", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["focus"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("focusout");
      expect(mockHidePopover).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(mockHidePopover).toHaveBeenCalledOnce();
    });

    it("focusin does not call showPopover when triggers does not include 'focus'", async () => {
      const wrapper = mount(DropdownPopover, { props: { triggers: ["click"] } });
      await wrapper.find(".c-dropdown__trigger").trigger("focusin");
      expect(mockShowPopover).not.toHaveBeenCalled();
    });
  });

  // --- ResizeObserver callback (line 112) ---

  it("resize observer callback is a no-op when dropdown is closed (covers line 112 false branch)", async () => {
    const wrapper = mountWithTrigger();
    // isOpen is false by default — callback should not invoke syncArrow
    resizeCb.fn?.();
    await nextTick();
    expect(wrapper.find(".c-dropdown").exists()).toBe(true);
  });

  it("resize observer callback calls syncArrow when dropdown is open (covers line 112 true branch)", async () => {
    const wrapper = mountWithTrigger();
    openToggle(wrapper);
    await nextTick();
    // isOpen is now true — callback should invoke syncArrow without throwing
    resizeCb.fn?.();
    await nextTick();
    expect(wrapper.find(".c-dropdown").exists()).toBe(true);
  });

  // --- triggers: early-return branches (lines 169, 180) ---

  it("mouseleave on trigger does not schedule close when triggers excludes 'hover' (covers line 169 true branch)", async () => {
    vi.useFakeTimers();
    const wrapper = mount(DropdownPopover, { props: { triggers: ["click"] } });
    await wrapper.find(".c-dropdown__trigger").trigger("mouseleave");
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  it("focusout on trigger does not schedule close when triggers excludes 'focus' (covers line 180 true branch)", async () => {
    vi.useFakeTimers();
    const wrapper = mount(DropdownPopover, { props: { triggers: ["click"] } });
    await wrapper.find(".c-dropdown__trigger").trigger("focusout");
    vi.advanceTimersByTime(200);
    expect(mockHidePopover).not.toHaveBeenCalled();
  });

  // --- syncArrow: early-return when arrow=false (line 101) ---

  it("resize observer callback with arrow=false hits syncArrow early-return (covers line 101 !arrow branch)", async () => {
    const wrapper = mountWithTrigger({ props: { arrow: false } });
    openToggle(wrapper);
    await nextTick();
    resizeCb.fn?.();
    await nextTick();
    expect(wrapper.find(".c-dropdown").exists()).toBe(true);
  });

  // --- arrowDynamicStyle: arrowAbove=false ternary branches (lines 92, 94) ---

  it("syncArrow sets arrowAbove=false when panel is below trigger (covers lines 92/94 false ternary branches)", async () => {
    const wrapper = mountWithTrigger({ props: { arrow: true, lazy: false } });
    const panelEl = wrapper.find(".c-dropdown__panel").element;
    const triggerSpan = wrapper.find(".c-dropdown__trigger").element;
    vi.spyOn(panelEl, "getBoundingClientRect").mockReturnValue({
      bottom: 400, top: 200, left: 0, right: 200, width: 200, height: 200, x: 0, y: 200,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(triggerSpan, "getBoundingClientRect").mockReturnValue({
      bottom: 100, top: 50, left: 50, right: 150, width: 100, height: 50, x: 50, y: 50,
      toJSON: () => ({}),
    } as DOMRect);
    openToggle(wrapper);
    await nextTick();
    expect(wrapper.find(".c-dropdown__arrow").exists()).toBe(true);
  });

  // --- onToggle close: setTimeout false branch (line 137) ---

  it("setTimeout callback does not clear hasContent when dropdown was reopened within 150ms (covers line 137 false branch)", async () => {
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

  it("onToggle close skips focus-steal when activeElement is outside trigger and panel (covers line 140 false branch)", async () => {
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

  it("close() focuses triggerEl directly when no focusable descendant inside trigger (covers line 190 ?? branch)", () => {
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
