// @ts-expect-error: Unresolved import
import ColorModeToggle from "@components/ColorModeToggle.vue";
import { $isDarkMode } from "@stores/index.ts";
import { mount } from "@vue/test-utils";
import { it, expect, describe, beforeEach, afterEach } from "vitest";

describe("ColorModeToggle", () => {
  beforeEach(() => {
    $isDarkMode.set(null);
    // System preference: light (not dark) → first click sets dark mode
    window.matchMedia = () => ({ matches: false }) as MediaQueryList;
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("renders the correct type", async () => {
    const wrapper = mount(ColorModeToggle);
    const button = wrapper.find("button");
    const html = document.documentElement;

    expect(html.classList.contains("dark")).toBe(false);
    await button.trigger("click");
    expect(html.classList.contains("dark")).toBe(true);
    await button.trigger("click");
    expect(html.classList.contains("dark")).toBe(false);
  });
});
