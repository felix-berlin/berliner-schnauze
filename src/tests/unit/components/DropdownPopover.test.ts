import DropdownPopover from "@components/DropdownPopover.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("DropdownPopover.vue", () => {
  it("uses provided id for popover linkage", () => {
    const wrapper = mount(DropdownPopover, {
      props: {
        id: "menu-1",
      },
      slots: {
        default: "Toggle",
        content: "Menu",
      },
    });

    expect(wrapper.get("button").attributes("popovertarget")).toBe("menu-1");
    expect(wrapper.get("div[popover]").attributes("id")).toBe("menu-1");
    expect(wrapper.text()).toContain("Toggle");
    expect(wrapper.text()).toContain("Menu");
  });

  it("generates an id when no id prop is passed", () => {
    const wrapper = mount(DropdownPopover, {
      slots: {
        default: "Toggle",
      },
    });

    const generatedId = wrapper.get("button").attributes("popovertarget");

    expect(generatedId).toMatch(/^dropdown-/);
    expect(wrapper.get("div[popover]").attributes("id")).toBe(generatedId);
  });
});