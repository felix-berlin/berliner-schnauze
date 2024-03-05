import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import BadgeTag from "@components/BadgeTag.vue";

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
