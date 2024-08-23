import { mount } from "@vue/test-utils";
import { describe, it, expect, afterEach } from "vitest";
import BerolinismusSwitch from "@components/filter/BerolinismusSwitch.vue";
import { $wordSearch } from "@stores/index.ts";
import { cleanStores, keepMount } from "nanostores";

describe("BerolinismusSwitch.vue", () => {
  afterEach(() => {
    cleanStores($wordSearch);
  });

  it("renders correctly", () => {
    keepMount($wordSearch);
    const wrapper = mount(BerolinismusSwitch);
    expect(wrapper.exists()).toBe(true);
  });

  it("checkbox is bound to berolinismus state", async () => {
    keepMount($wordSearch);

    const wrapper = mount(BerolinismusSwitch);
    const checkbox = wrapper.find('input[type="checkbox"]');

    expect(checkbox.element.checked).toBe(false);

    await checkbox.setValue(true);

    expect($wordSearch.get().berolinismus).toBe(true);
  });

  it("renders label correctly", () => {
    keepMount($wordSearch);

    const wrapper = mount(BerolinismusSwitch);
    const label = wrapper.find("label");
    expect(label.text()).toBe("Berolinismus");
  });
});
