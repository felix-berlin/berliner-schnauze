import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SocialList from "@components/SocialList.vue";

describe("SocialList", () => {
  it("renders without crashing", () => {
    const wrapper = mount(SocialList);
    expect(wrapper.exists()).toBe(true);
  });

  it("contains the .social-list class", () => {
    const wrapper = mount(SocialList);
    expect(wrapper.classes()).toContain("c-social-list");
  });
});
