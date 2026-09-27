import MainMenuButton from "@components/MainMenuButton.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("MainMenuButton.vue", () => {
  it("uses its visible label as accessible name", () => {
    const btn = mount(MainMenuButton).find("button");
    expect(btn.attributes("aria-label")).toBeUndefined();
    expect(btn.attributes("type")).toBe("button");
    expect(btn.text()).toBe("Menü");
  });

  it("keeps both icons mounted for the CSS crossfade", () => {
    const icons = mount(MainMenuButton).find(".c-header-control__icons");
    expect(icons.attributes("aria-hidden")).toBe("true");
    expect(icons.find("[data-testid='icon-lucide-menu']").exists()).toBe(true);
    expect(icons.find("[data-testid='icon-lucide-x']").exists()).toBe(true);
  });

  it("passes aria-expanded through from the dropdown trigger props", () => {
    const btn = mount(MainMenuButton, { attrs: { "aria-expanded": "true" } }).find("button");
    expect(btn.attributes("aria-expanded")).toBe("true");
  });
});
