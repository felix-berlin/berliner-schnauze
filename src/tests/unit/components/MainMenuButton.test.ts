import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

describe("MainMenuButton.vue", () => {
  it("uses its visible label as accessible name", async () => {
    const MainMenuButton = (await import("@components/MainMenuButton.vue")).default;
    const btn = mount(MainMenuButton).find("button");
    expect(btn.attributes("aria-label")).toBeUndefined();
    expect(btn.text()).toBe("Menü");
  });

  it("button has type button", async () => {
    const MainMenuButton = (await import("@components/MainMenuButton.vue")).default;
    const wrapper = mount(MainMenuButton);
    expect(wrapper.find("button").attributes("type")).toBe("button");
  });

  it("swaps the menu icon for an x while open", async () => {
    const MainMenuButton = (await import("@components/MainMenuButton.vue")).default;
    const closed = mount(MainMenuButton);
    expect(closed.find("[data-testid='icon-lucide-menu']").exists()).toBe(true);
    const open = mount(MainMenuButton, { props: { isOpen: true } });
    await vi.dynamicImportSettled(); // XIcon is async
    await flushPromises();
    expect(open.find("[data-testid='icon-lucide-x']").exists()).toBe(true);
    expect(open.text()).toContain("Menü");
  });
});
