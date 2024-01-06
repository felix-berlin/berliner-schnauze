import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import CarbonBadge from "@components/CarbonBadge.vue";

describe("CarbonBadge.vue", () => {
  test("renders default props correctly", () => {
    const wrapper = mount(CarbonBadge);

    // Check if the default url is rendered correctly
    expect(wrapper.find("a").attributes("href")).toBe(
      "https://www.websitecarbon.com/website/berliner-schnauze-wtf/",
    );

    // Check if the default text is rendered correctly
    expect(wrapper.find("span").text()).toBe("umweltschonend");
  });
});
