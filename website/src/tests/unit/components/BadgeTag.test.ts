import BadgeTag from "@components/BadgeTag.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("BadgeTag.vue", () => {
  it("renders .c-badge span", () => {
    const wrapper = mount(BadgeTag);
    expect(wrapper.find("span.c-badge").exists()).toBe(true);
  });

  it("renders slot content inside a [data-slot] wrapper, not on the root", () => {
    const wrapper = mount(BadgeTag, { slots: { default: "Hello World" } });
    expect(wrapper.attributes("data-slot")).toBeUndefined();
    expect(wrapper.find(".c-badge > [data-slot]").text()).toBe("Hello World");
  });
});
