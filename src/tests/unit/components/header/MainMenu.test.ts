import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@components/DropdownPopover.vue", () => ({
  default: {
    name: "DropdownPopover",
    template: "<div class=\"c-menu-more\"><slot /><slot name=\"panel\" /></div>",
  },
}));

vi.mock("@components/MainMenuButton.vue", () => ({
  default: {
    name: "MainMenuButton",
    template: "<button type=\"button\">Menu</button>",
  },
}));

vi.mock("@components/NavList.vue", () => ({
  default: {
    name: "NavList",
    props: ["items", "classesUl", "classesLi"],
    template: "<ul><li v-for=\"item in items\" :key=\"item.link || item.component\">{{ item.title }}</li></ul>",
  },
}));

vi.mock("@components/InstallApp.vue", () => ({
  default: {
    name: "InstallApp",
    template: "<div class=\"install-app\" />",
  },
}));

describe("MainMenu.vue", () => {
  it("renders without errors", async () => {
    const MainMenu = (await import("@components/header/MainMenu.vue")).default;
    const wrapper = mount(MainMenu);
    expect(wrapper.exists()).toBe(true);
  });

  it("passes menuItems with expected nav links to NavList", async () => {
    const MainMenu = (await import("@components/header/MainMenu.vue")).default;
    const wrapper = mount(MainMenu);
    const text = wrapper.text();
    expect(text).toContain("Spiel - Berliner oder nicht?");
    expect(text).toContain("Wort vorschlagen");
    expect(text).toContain("Wort Index");
    expect(text).toContain("Einstellungen");
  });

  it("uses DropdownPopover as root wrapper", async () => {
    const MainMenu = (await import("@components/header/MainMenu.vue")).default;
    const wrapper = mount(MainMenu);
    expect(wrapper.findComponent({ name: "DropdownPopover" }).exists()).toBe(true);
  });

  it("renders MainMenuButton inside the default slot", async () => {
    const MainMenu = (await import("@components/header/MainMenu.vue")).default;
    const wrapper = mount(MainMenu);
    expect(wrapper.findComponent({ name: "MainMenuButton" }).exists()).toBe(true);
  });
});
