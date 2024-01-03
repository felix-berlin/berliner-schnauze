import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach } from "vitest";
import ToastNotify from "@components/toast/ToastNotify.vue";

describe("ToastNotify.vue", () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(ToastNotify, {
      props: {
        status: "info",
        showStatusIcon: true,
        position: "top-right",
        outerSpacing: "20px",
        gapBetween: 10,
        initOffset: 100,
        showClose: true,
        closeOnSwipe: true,
      },
    });
  });

  it("initializes with correct default props", () => {
    expect(wrapper.props().status).toBe("info");
    expect(wrapper.props().showStatusIcon).toBe(true);
    expect(wrapper.props().position).toBe("top-right");
    expect(wrapper.props().outerSpacing).toBe("20px");
    expect(wrapper.props().gapBetween).toBe(10);
    expect(wrapper.props().initOffset).toBe(100);
    expect(wrapper.props().showClose).toBe(true);
    expect(wrapper.props().closeOnSwipe).toBe(true);
  });
});
