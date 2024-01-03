import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ConfettiEffect from "@components/ConfettiEffect.vue";

describe("ConfettiEffect.vue", () => {
  it("renders the correct number of pieces when passed", () => {
    const pieces = 5;
    const wrapper = mount(ConfettiEffect, {
      props: {
        pieces,
      },
    });
    expect(wrapper.findAll(".c-confetti__piece").length).toBe(pieces);
  });

  // TODO: Fix this test - fails maybe because of propsDestructure?
  // it("renders 10 pieces by default", () => {
  //   const wrapper = mount(ConfettiEffect);

  //   expect(wrapper.findAll(".c-confetti__piece").length).toBe(10);
  // });

  it("has the correct class for the wrapper", () => {
    const wrapper = mount(ConfettiEffect);
    expect(wrapper.classes()).toContain("c-confetti__wrapper");
  });
});
