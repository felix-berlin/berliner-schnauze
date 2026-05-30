// @ts-ignore: Unresolved import
import ColorModeToggle from "@components/ColorModeToggle.vue";
import { mount } from "@vue/test-utils";
import { JSDOM } from "jsdom";
import { it, expect, describe, beforeEach } from "vitest";
import { $isDarkMode } from "@stores/index.ts";

describe("ColorModeToggle", async () => {
  beforeEach(() => {
    $isDarkMode.set(null);
  });

  it("renders the correct type", async () => {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");

    global.window = dom.window;
    global.document = dom.window.document;

    // System preference: light (not dark) → first click sets dark mode
    global.window.matchMedia = () =>
      ({ matches: false }) as MediaQueryList;

    const wrapper = mount(ColorModeToggle);
    const button = wrapper.find("button");
    const html = document.querySelector("html");

    expect(html?.classList.contains("dark")).toBe(false);
    await button.trigger("click");
    expect(html?.classList.contains("dark")).toBe(true);
    await button.trigger("click");
    expect(html?.classList.contains("dark")).toBe(false);
  });
});
