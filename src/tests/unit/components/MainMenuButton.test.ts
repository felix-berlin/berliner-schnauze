import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";


describe("MainMenuButton.vue", () => {
  it("renders a button with correct aria-label", async () => {
    const MainMenuButton = (await import("@components/MainMenuButton.vue")).default;
    const wrapper = mount(MainMenuButton);
    const btn = wrapper.find("button");
    expect(btn.exists()).toBe(true);
    expect(btn.attributes("aria-label")).toBe("Website Menu Navigation");
  });

  it("button has type button", async () => {
    const MainMenuButton = (await import("@components/MainMenuButton.vue")).default;
    const wrapper = mount(MainMenuButton);
    expect(wrapper.find("button").attributes("type")).toBe("button");
  });
});
