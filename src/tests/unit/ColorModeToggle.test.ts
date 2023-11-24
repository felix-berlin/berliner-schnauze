import { mount } from "@vue/test-utils";
import { JSDOM } from "jsdom";
import { it, expect, describe } from "vitest";
// @ts-ignore: Unresolved import
import ColorModeToggle from "@components/ColorModeToggle.vue";

describe("ColorModeToggle", async () => {
  it("renders the correct type", async () => {
    // Create a new JSDOM instance
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");

    // Set the global window and document objects to the JSDOM window and document objects
    global.window = dom.window;
    global.document = dom.window.document;

    // Mount the component
    const wrapper = mount(ColorModeToggle);

    // Test that the button toggles the color mode
    const button = wrapper.find("button");
    const html = document.querySelector("html");

    expect(html?.classList.contains("dark")).toBe(false);
    await button.trigger("click");
    expect(html?.classList.contains("dark")).toBe(true);
    await button.trigger("click");
    expect(html?.classList.contains("dark")).toBe(false);
  });
});
