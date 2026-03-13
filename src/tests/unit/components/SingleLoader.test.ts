import SingleLoader from "@components/SingleLoader.vue";
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";

describe("SingleLoader.vue", () => {
  it("renders correctly", () => {
    const wrapper = mount(SingleLoader);
    expect(wrapper.exists()).toBe(true);
  });

  it("contains the loader element", () => {
    const wrapper = mount(SingleLoader);
    const loader = wrapper.find(".c-single-loader__loader");
    expect(loader.exists()).toBe(true);
  });
});
