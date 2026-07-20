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
    template:
      "<ul><li v-for=\"(item, index) in items\" :key=\"index\" " +
      ":class=\"typeof classesLi === 'function' ? classesLi(item, index) : classesLi\">" +
      "<component v-if=\"item.component\" :is=\"item.component\" v-bind=\"item.props\" />" +
      "<template v-else>{{ item.title }}</template></li></ul>",
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

  it("renders the CMS-provided menuItems alongside the fixed install item", async () => {
    const MainMenu = (await import("@components/header/MainMenu.vue")).default;
    const wrapper = mount(MainMenu, {
      props: {
        menuItems: [
          { link: "/magazin", title: "Magazin" },
          { link: "/wort", title: "Wort Index" },
        ],
      },
    });
    const text = wrapper.text();
    expect(text).toContain("Magazin");
    expect(text).toContain("Wort Index");
    expect(wrapper.find(".install-app").exists()).toBe(true);
  });

  it("puts the install item first regardless of CMS item order", async () => {
    const MainMenu = (await import("@components/header/MainMenu.vue")).default;
    const wrapper = mount(MainMenu, {
      props: { menuItems: [{ link: "/magazin", title: "Magazin" }] },
    });
    const items = wrapper.findAll("li");
    expect(items[0].find(".install-app").exists()).toBe(true);
    expect(items[1].text()).toBe("Magazin");
  });

  it("adds a dashed divider before the first CMS item, none when the CMS menu is empty", async () => {
    const MainMenu = (await import("@components/header/MainMenu.vue")).default;

    const withItems = mount(MainMenu, {
      props: { menuItems: [{ link: "/magazin", title: "Magazin" }] },
    });
    expect(withItems.findAll("li")[1].classes()).toContain("is-split");

    const empty = mount(MainMenu, { props: { menuItems: [] } });
    expect(empty.findAll("li")).toHaveLength(1);
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
