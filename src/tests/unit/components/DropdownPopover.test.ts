import DropdownPopover from "@components/DropdownPopover.vue";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockShowPopover = vi.fn();
const mockHidePopover = vi.fn();

beforeEach(() => {
  HTMLElement.prototype.showPopover = mockShowPopover;
  HTMLElement.prototype.hidePopover = mockHidePopover;
});
afterEach(() => vi.clearAllMocks());

const openToggle = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .find(".c-dropdown__panel")
    .element.dispatchEvent(new ToggleEvent("toggle", { newState: "open", bubbles: false }));

const closeToggle = (wrapper: ReturnType<typeof mount>) =>
  wrapper
    .find(".c-dropdown__panel")
    .element.dispatchEvent(new ToggleEvent("toggle", { newState: "closed", bubbles: false }));

describe("DropdownPopover.vue", () => {
  it("renders default slot content inside trigger button", () => {
    const wrapper = mount(DropdownPopover, { slots: { default: "<span>Open</span>" } });
    expect(wrapper.find(".c-dropdown__trigger span").text()).toBe("Open");
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

  it("trigger popovertarget matches panel id", () => {
    const wrapper = mount(DropdownPopover);
    const panelId = wrapper.find(".c-dropdown__panel").attributes("id");
    expect(wrapper.find(".c-dropdown__trigger").attributes("popovertarget")).toBe(panelId);
  });

  it("trigger aria-controls matches panel id", () => {
    const wrapper = mount(DropdownPopover);
    const panelId = wrapper.find(".c-dropdown__panel").attributes("id");
    expect(wrapper.find(".c-dropdown__trigger").attributes("aria-controls")).toBe(panelId);
  });

  it("aria-expanded is 'false' initially", () => {
    const wrapper = mount(DropdownPopover);
    expect(wrapper.find(".c-dropdown__trigger").attributes("aria-expanded")).toBe("false");
  });

  it("aria-expanded becomes 'true' after toggle newState='open'", async () => {
    const wrapper = mount(DropdownPopover);
    openToggle(wrapper);
    await nextTick();
    expect(wrapper.find(".c-dropdown__trigger").attributes("aria-expanded")).toBe("true");
  });

  it("aria-expanded becomes 'false' after toggle newState='closed'", async () => {
    const wrapper = mount(DropdownPopover);
    openToggle(wrapper);
    await nextTick();
    closeToggle(wrapper);
    await nextTick();
    expect(wrapper.find(".c-dropdown__trigger").attributes("aria-expanded")).toBe("false");
  });

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

  it("trigger style contains anchor-name", () => {
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

  it("close() calls hidePopover and returns focus to trigger", () => {
    const wrapper = mount(DropdownPopover, { attachTo: document.body });
    const focusSpy = vi.spyOn(wrapper.find(".c-dropdown__trigger").element, "focus");
    (wrapper.vm as any).close();
    expect(mockHidePopover).toHaveBeenCalledOnce();
    expect(focusSpy).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("inherited attrs land on trigger button, not wrapper div", () => {
    const wrapper = mount(DropdownPopover, { attrs: { "aria-haspopup": "menu" } });
    expect(wrapper.find(".c-dropdown__trigger").attributes("aria-haspopup")).toBe("menu");
    expect(wrapper.find(".c-dropdown").attributes("aria-haspopup")).toBeUndefined();
  });

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

    it("panel slot stays mounted after close (hasOpened stays true)", async () => {
      const wrapper = mount(DropdownPopover, {
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      openToggle(wrapper);
      await nextTick();
      closeToggle(wrapper);
      await nextTick();
      expect(wrapper.find(".panel-item").exists()).toBe(true);
    });

    it("panel slot renders immediately on mount when lazy=false", () => {
      const wrapper = mount(DropdownPopover, {
        props: { lazy: false },
        slots: { panel: '<button class="panel-item">Action</button>' },
      });
      expect(wrapper.find(".panel-item").exists()).toBe(true);
    });
  });
});
