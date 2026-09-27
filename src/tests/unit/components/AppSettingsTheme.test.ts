import AppSettingsTheme from "@components/AppSettingsTheme.vue";
import ColorModePicker from "@components/ColorModePicker.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("AppSettingsTheme.vue", () => {
  it("renders the labelled colour mode picker for settings", () => {
    const wrapper = mount(AppSettingsTheme);
    expect(wrapper.find("h2").text()).toContain("Erscheinungsbild");
    const picker = wrapper.findComponent(ColorModePicker);
    expect(picker.props()).toMatchObject({ showLabels: true, source: "Settings" });
  });
});
