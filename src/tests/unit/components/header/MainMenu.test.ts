import { mount } from "@vue/test-utils";
import { atom } from "nanostores";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isPwaInstalled = atom(false);
const setDarkMode = vi.fn();

vi.mock("@components/DropdownPopover.vue", () => ({
  default: {
    name: "DropdownPopover",
    template: '<div><slot :trigger-props="{}" :is-open="false" /><slot name="panel" /></div>',
  },
}));

vi.mock("@components/MainMenuButton.vue", () => ({
  default: { name: "MainMenuButton", template: '<button type="button">Menü</button>' },
}));

vi.mock("@components/InstallApp.vue", async () => {
  const { createComponentStub } = await import("../../helpers");
  return createComponentStub('<button class="install-app"><slot /></button>');
});

vi.mock("@stores/installApp.ts", () => ({ $isPwaInstalled: isPwaInstalled }));

vi.mock("@stores/darkMode.ts", async () => {
  const { atom: a } = await import("nanostores");
  return { $isDarkMode: a<boolean | null>(null), setDarkMode };
});

const menuItems = [
  { description: "Alle Wörter von A bis Z", link: "/wort", title: "Wort Index" },
  {
    description: "Berlinerisch lernen, Karte für Karte",
    link: "/anki",
    title: "Anki-Karteikarten",
  },
  { link: "/wort-vorschlagen", title: "Wort vorschlagen" },
  { link: "/changelog", title: "Was ist neu?" },
];

const mountMenu = async () => {
  const MainMenu = (await import("@components/header/MainMenu.vue")).default;
  return mount(MainMenu, { props: { menuItems } });
};

describe("MainMenu.vue", () => {
  beforeEach(() => {
    isPwaInstalled.set(false);
    setDarkMode.mockClear();
  });

  it("renders items with a description as discover cards", async () => {
    const wrapper = await mountMenu();
    const cards = wrapper.findAll(".c-main-menu__card");
    expect(cards.map((c) => c.attributes("href"))).toEqual(["/wort", "/anki"]);
    expect(cards[0].text()).toContain("Alle Wörter von A bis Z");
  });

  it("drops the discover column when no CMS item has a description", async () => {
    const MainMenu = (await import("@components/header/MainMenu.vue")).default;
    const wrapper = mount(MainMenu, {
      props: { menuItems: [{ link: "/spenden", title: "Spenden" }] },
    });
    expect(wrapper.find(".c-main-menu__col--discover").exists()).toBe(false);
  });

  it("tags only the Anki entry as new", async () => {
    const wrapper = await mountMenu();
    const tags = wrapper.findAll(".c-main-menu__tag");
    expect(tags).toHaveLength(1);
    expect(wrapper.findAll(".c-main-menu__card")[1].text()).toContain("Neu");
  });

  it("splits the remaining links into Mitmachen and App groups", async () => {
    const wrapper = await mountMenu();
    const labels = wrapper.findAll(".c-main-menu__label").map((l) => l.text());
    expect(labels).toEqual(["Entdecken", "Mitmachen", "App"]);
    const links = wrapper.findAll(".c-main-menu__link").map((l) => l.attributes("href"));
    expect(links).toEqual(["/wort-vorschlagen", "/changelog"]);
  });

  it("renders the icon-only colour mode picker", async () => {
    const wrapper = await mountMenu();
    const picker = wrapper.findComponent({ name: "ColorModePicker" });
    expect(picker.props()).toMatchObject({ showLabels: false, source: "Main Menu" });
  });

  it("hides the install bar once the app is installed", async () => {
    const wrapper = await mountMenu();
    expect(wrapper.find(".c-main-menu__install").exists()).toBe(true);
    isPwaInstalled.set(true);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".c-main-menu__install").exists()).toBe(false);
  });
});
