import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@components/DropdownPopover.vue", () => ({
  default: {
    name: "DropdownPopover",
    template: "<div class=\"c-dropdown-popover\"><slot /><slot name=\"panel\" /></div>",
  },
}));

vi.mock("@components/ColorModeToggle.vue", () => ({
  default: {
    name: "ColorModeToggle",
    template: "<button class=\"mock-color-mode-toggle\" />",
  },
}));

vi.mock("@components/modals/search/SearchModal.vue", () => ({
  default: {
    name: "SearchModal",
    template: "<div class=\"mock-search-modal\" />",
  },
}));

vi.mock("@utils/helpers.ts", () => ({
  randomElement: vi.fn(),
  routeToWord: vi.fn((slug: string) => `/wort/${slug}`),
}));

beforeEach(() => {
  vi.resetModules();
});

describe("MainHeader.vue", () => {
  it("renders header.c-header element", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    expect(wrapper.find("header.c-header").exists()).toBe(true);
  });

  it("renders logo link pointing to /", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    const logoLink = wrapper.find(".c-logo__link");
    expect(logoLink.exists()).toBe(true);
    expect(logoLink.attributes("href")).toBe("/");
  });

  it("contains Berliner Schnauze text in the logo", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    expect(wrapper.find(".c-logo").text()).toContain("Berliner Schnauze");
  });

  it("renders navigation element", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    expect(wrapper.find("nav").exists()).toBe(true);
  });

  it("navigation has class c-menu-nav", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    expect(wrapper.find("nav.c-menu-nav").exists()).toBe(true);
  });

  it("renders SearchModal component", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    expect(wrapper.find(".mock-search-modal").exists()).toBe(true);
  });

  it("renders ColorModeToggle component", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    expect(wrapper.find(".mock-color-mode-toggle").exists()).toBe(true);
  });

  it("renders DropdownPopover component", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    expect(wrapper.findComponent({ name: "DropdownPopover" }).exists()).toBe(true);
  });

  it("renders menu icon inside navigation button area", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    expect(wrapper.find("[data-testid='icon-lucide-menu']").exists()).toBe(true);
  });

  it("renders menu items in the dropdown panel", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    const text = wrapper.text();
    expect(text).toContain("Wort vorschlagen");
    expect(text).toContain("tech. Fehler melden");
    expect(text).toContain("Impressum");
    expect(text).toContain("Datenschutz");
  });

  it("renders intern menu items as plain links (no target=_blank)", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    const impressumLink = wrapper.findAll("a").find((a) => a.text() === "Impressum");
    expect(impressumLink).toBeDefined();
    expect(impressumLink?.attributes("target")).toBeUndefined();
  });

  it("renders external menu items with target=_blank", async () => {
    const MainHeader = (await import("@components/header/MainHeader.vue")).default;
    const wrapper = mount(MainHeader);
    const externalLink = wrapper.findAll("a").find((a) => a.text() === "tech. Fehler melden");
    expect(externalLink).toBeDefined();
    expect(externalLink?.attributes("target")).toBe("_blank");
  });
});
