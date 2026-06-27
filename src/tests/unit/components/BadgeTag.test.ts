import BadgeTag from "@components/BadgeTag.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("BadgeTag.vue", () => {
  it("renders .c-badge span", () => {
    const wrapper = mount(BadgeTag);
    expect(wrapper.find("span.c-badge").exists()).toBe(true);
  });

  it("renders slot content", () => {
    const wrapper = mount(BadgeTag, { slots: { default: "Hello World" } });
    expect(wrapper.text()).toBe("Hello World");
  });
});
