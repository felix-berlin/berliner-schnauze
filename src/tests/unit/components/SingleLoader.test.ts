import SingleLoader from "@components/SingleLoader.vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("SingleLoader.vue", () => {
  it("renders .c-single-loader container", () => {
    const wrapper = mount(SingleLoader);
    expect(wrapper.find(".c-single-loader").exists()).toBe(true);
  });

  it("contains .c-single-loader__loader child", () => {
    const wrapper = mount(SingleLoader);
    expect(wrapper.find(".c-single-loader__loader").exists()).toBe(true);
  });
});
