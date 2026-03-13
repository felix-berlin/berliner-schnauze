import BadgeTag from "@components/BadgeTag.vue";
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";

describe("BadgeTag.vue", () => {
  it("renders slot content when passed", () => {
    const slotContent = "Hello World";
    const wrapper = mount(BadgeTag, {
      slots: {
        default: slotContent,
      },
    });
    expect(wrapper.text()).toMatch(slotContent);
  });
});
