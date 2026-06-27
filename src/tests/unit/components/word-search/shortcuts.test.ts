import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";


describe("ShortcutClose.vue", () => {
  it("renders ESC shortcut text", async () => {
    const ShortcutClose = (await import("@components/word-search/shortcuts/ShortcutClose.vue")).default;
    const wrapper = mount(ShortcutClose);
    expect(wrapper.find("kbd").text()).toBe("ESC");
    expect(wrapper.text()).toContain("schließen");
  });
});

describe("ShortcutNavigating.vue", () => {
  it("renders navigation shortcut", async () => {
    const ShortcutNavigating = (await import("@components/word-search/shortcuts/ShortcutNavigating.vue")).default;
    const wrapper = mount(ShortcutNavigating);
    expect(wrapper.text()).toContain("navigieren");
    expect(wrapper.findAll("kbd").length).toBeGreaterThanOrEqual(1);
  });
});

describe("ShortcutSelect.vue", () => {
  it("renders select shortcut", async () => {
    const ShortcutSelect = (await import("@components/word-search/shortcuts/ShortcutSelect.vue")).default;
    const wrapper = mount(ShortcutSelect);
    expect(wrapper.text()).toContain("auswählen");
    expect(wrapper.find("kbd").exists()).toBe(true);
  });
});
