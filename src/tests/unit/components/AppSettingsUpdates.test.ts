import AppSettingsUpdates from "@components/AppSettingsUpdates.vue";
import { $updateMode } from "@stores/pwaSettings.ts";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@utils/analytics", () => ({ trackEvent: vi.fn() }));

describe("AppSettingsUpdates.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    $updateMode.set("prompt");
  });

  it("renders a fieldset with the three update modes", () => {
    const wrapper = mount(AppSettingsUpdates);
    expect(wrapper.find("fieldset legend").text()).toContain("App-Updates");
    expect(wrapper.findAll("input[type=radio]")).toHaveLength(3);
    for (const label of ["Nachfragen", "Automatisch", "Beim nächsten Start"]) {
      expect(wrapper.text()).toContain(label);
    }
  });

  it.each([
    ["prompt", 0],
    ["auto", 1],
    ["next-start", 2],
  ] as const)("checks the radio for %s", (mode, index) => {
    $updateMode.set(mode);
    const radios = mount(AppSettingsUpdates).findAll<HTMLInputElement>("input[type=radio]");
    radios.forEach((r, i) => expect(r.element.checked).toBe(i === index));
  });

  it("selecting a mode updates the store and tracks it", async () => {
    const { trackEvent } = await import("@utils/analytics");
    const wrapper = mount(AppSettingsUpdates);
    await wrapper.findAll("input[type=radio]")[1].setValue(true);
    expect($updateMode.get()).toBe("auto");
    expect(trackEvent).toHaveBeenCalledWith("App", "Update mode: auto", "Settings");
  });
});
